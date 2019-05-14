import 'reflect-metadata'
import { Opium, LifeCycle, Dependency } from 'opium-ioc'
import { nextTick, any } from 'async'
import { debug as debugFactory } from 'debug'

const debug = debugFactory('opium-decorator-resolvers')

export { LifeCycle }
export const OPIUM_META = Symbol.for('design:opium:meta')
export enum ResolverType {
  TYPE,
  FACTORY,
  INSTANCE
}

export enum TargeType {
  CONSTRUCTOR = 1,
  PROPERTY = 2,
  METHOD = 3
}

export class ResolverMeta {
  public id: any
  public target: any
  public type: ResolverType = ResolverType.TYPE
  public lifeCycle: LifeCycle = LifeCycle.SINGLETON
  public deps: ResolverMeta[] = []
  public metaKey: any
}

function isSimpleType (name: string) {
  return [
    'String',
    'Number',
    'Boolean',
    'Object',
    'undefined',
    'Array',
    'Function'
  ].indexOf(name) > -1
}

const registry: Map<any, ResolverMeta> = new Map()
function registerWithContainer (rootDep: ResolverMeta, container: Opium) {
  const stack: ResolverMeta[] = []
  stack.push(rootDep)
  while (stack.length) {
    const depRef: ResolverMeta | undefined = stack.pop()
    if (!depRef) continue

    const dep = registry.get(depRef.id)
    if (!dep) continue

    // skip if its already registered
    if (container.getDep(dep.id)) continue
    if (dep.deps && dep.deps.length) {
      stack.push(...dep.deps)
    }

    switch (dep.type) {
      case ResolverType.FACTORY: {
        container.registerFactory(dep.id,
          dep.target,
          dep.deps.map(a => a.id),
          dep.lifeCycle)
        break
      }

      case ResolverType.TYPE: {
        // register prototype properties
        const depMeta: ResolverMeta | undefined = registry.get(dep.target.prototype)
        if (depMeta) {
          stack.push(...depMeta.deps)
        }

        container.registerFactory(dep.id,
          async (...args: any[]) => {
            const res = Reflect.construct(dep.target, args)
            if (depMeta) {
              await Promise.all(depMeta.deps.map(async (d: any) => {
                const dep = await container.getDep(d.id).injectDeps()
                const injectDep = await dep.injected
                res[d.metaKey] = injectDep
                return res[d.metaKey]
              }))
            }
            return res
          },
          dep.deps.map(a => a.id),
          dep.lifeCycle)
        break
      }

      case ResolverType.INSTANCE: {
        container.registerInstance(dep.id,
          dep.target,
          dep.deps.map(a => a.id),
          dep.lifeCycle)
        break
      }

      default: {
        throw new Error(`Unknown dependency type ${dep.type}!`)
      }
    }
  }
}

export let container: Opium
export function injectableFactory (name ?: string, lifeCycle ?: LifeCycle) {
  container = new Opium(name, lifeCycle)
  return getInjectable
}

function getInjectable (target: any, key?: any) {
  // now lets register everything with the container the deps graph
  const depMeta: ResolverMeta = Reflect.getMetadata(OPIUM_META, target, key)
  registerWithContainer(depMeta, container)
  const injectable: Dependency = container.getDep(depMeta.id)
  return injectable
}

export function inject (id?: string | Symbol, name?: string, lifeCycle?: LifeCycle): any {
  injectableFactory(name, lifeCycle)
  return function factory (...args: any[]) {
    const [target, key] = args
    // first inject the app itself
    const depFactory: Function = register(id)
    if (depFactory) {
      depFactory(...args)
    }

    const injectable: any = getInjectable(target, key)
    nextTick(async () => {
      try {
        await injectable.inject()
      } catch (e) {
        debug(e)
        return Promise.reject(e)
      }
    })
  }
}

export function register (id?: any, lifeCycle?: LifeCycle): any {
  return function factory (...args: any[]) {
    const [target, key, descriptor] = args
    if (args.length === 3 && typeof args[2] === 'undefined') args.pop()
    if (args.length === 2 && typeof args[1] === 'undefined') args.pop()

    let targetType: TargeType = args.length
    if (descriptor && (descriptor.get || descriptor.set)) {
      targetType = TargeType.PROPERTY
    }

    let targetMeta: ResolverMeta | null = null
    switch (targetType) {
      // constructor
      case TargeType.CONSTRUCTOR: {
        targetMeta = Reflect.getMetadata(OPIUM_META, target, key)
        if (!targetMeta) {
          targetMeta = new ResolverMeta()
          targetMeta.target = target
          // save the resolver metadata
          Reflect.defineMetadata(OPIUM_META, targetMeta, target, key)
        }

        targetMeta.type = ResolverType.TYPE
        targetMeta.lifeCycle = lifeCycle || targetMeta.lifeCycle
        targetMeta.target = target
        targetMeta.id = id || target

        registerDeps(targetMeta, target, key)
        break
      }

      // properties
      case TargeType.PROPERTY: {
        targetMeta = Reflect.getMetadata(OPIUM_META, target)
        if (!targetMeta) {
          targetMeta = new ResolverMeta()
          targetMeta.target = target
          // save the resolver metadata
          Reflect.defineMetadata(OPIUM_META, targetMeta, target)
        }

        let depMeta: ResolverMeta = new ResolverMeta()
        depMeta.id = id
        depMeta.metaKey = key
        targetMeta.deps.push(depMeta)

        if (typeof target[key] !== 'undefined') {
          depMeta.type = ResolverType.INSTANCE
          depMeta.target = target[key]
          registry.set(depMeta.id, depMeta)
        }

        break
      }

      // method or params
      case TargeType.METHOD: {
        targetMeta = Reflect.getMetadata(OPIUM_META, target, key)
        if (!targetMeta) {
          targetMeta = new ResolverMeta()
          targetMeta.target = target
          // save the resolver metadata
          Reflect.defineMetadata(OPIUM_META, targetMeta, target, key)
        }

        // if descriptor is a number, then this is a param
        if (typeof descriptor === 'number') {
          // register dependencies if there are any
          const annotatedDeps: any[] = Reflect.getMetadata('design:paramtypes', target, key) || []
          registerParam(annotatedDeps[descriptor], descriptor, targetMeta, lifeCycle, id)
          return
        }

        targetMeta.type = ResolverType.FACTORY
        targetMeta.target = descriptor.value
        targetMeta.lifeCycle = lifeCycle || targetMeta.lifeCycle
        targetMeta.id = id || Reflect.getMetadata('design:returntype', target, key)

        registerDeps(targetMeta, target, key)
        break
      }
    }

    if (targetMeta) {
      registry.set(targetMeta.id || target, targetMeta)
    }
  }
}

function registerDeps (targetMeta: ResolverMeta, target: any, key?: any) {
  // get the non annotated params and place them in the right index
  const deps: any[] = Reflect.getMetadata('design:paramtypes', target, key) || []
  deps.forEach((d: any, i: number) => {
    if (!targetMeta.deps[i]) {
      registerParam(d, i, targetMeta)
    }
  })
}

function registerParam (param: any, index: number, targetMeta: ResolverMeta, lifeCycle?: LifeCycle, id?: any) {
  if (isSimpleType(param.name) && !id) {
    throw new Error(`type ${param.name} requires a custom identifier, ` +
      `consider annotating with @register('my-id')`)
  }

  let depMeta: ResolverMeta = new ResolverMeta()
  depMeta.id = id || param
  targetMeta.deps[index] = depMeta
}
