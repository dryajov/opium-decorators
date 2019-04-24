import 'reflect-metadata'
import { Opium, LifeCycle, Dependency } from 'opium-ioc'
import { nextTick } from 'async'

export const OPIUM_META = Symbol.for('design:opium:meta')
export enum ResolverType {
  TYPE,
  FACTORY,
  INSTANCE
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

function registerWithContainer (rootDep: ResolverMeta, container: Opium) {
  const stack: ResolverMeta[] = []
  stack.push(rootDep)
  while (stack.length) {
    const dep = stack.pop()
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
        container.registerType(dep.id,
          dep.target,
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

let container: Opium
export function inject (id?: string | Symbol, name?: string, lifeCycle?: LifeCycle): any {
  container = new Opium(name, lifeCycle)
  return function factory (...args: any[]) {
    const [target, key] = args
    // first inject the app itself
    const depFactory: Function = register(id)
    if (depFactory) {
      depFactory(...args)
    }

    // now lets register everything with the container the deps graph
    const depMeta: ResolverMeta = Reflect.getMetadata(OPIUM_META, target, key)
    registerWithContainer(depMeta, container)
    const app: Dependency = container.getDep(depMeta.id)
    nextTick(async () => app.inject())
  }
}

export function register (id?: any, lifeCycle?: LifeCycle): any {
  return function factory (...args: any[]) {
    const [target, key, descriptor] = args
    let targetMeta: ResolverMeta = Reflect.getMetadata(OPIUM_META, target, key)
    if (!targetMeta) {
      targetMeta = new ResolverMeta()
      targetMeta.metaKey = key
      // save the resolver metadata
      Reflect.defineMetadata(OPIUM_META, targetMeta, target, key)
    }

    switch (args.length) {
      // constructor
      case 1: {
        targetMeta.type = ResolverType.TYPE
        targetMeta.lifeCycle = lifeCycle || targetMeta.lifeCycle
        targetMeta.target = target
        if (id) {
          targetMeta.id = id
        } else {
          targetMeta.id = target
        }

        registerDeps(targetMeta, target, key)
        return
      }

      // case 2: {
      // }

      // method or params
      case 3: {
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
        if (id) {
          targetMeta.id = id
        } else {
          targetMeta.id = Reflect.getMetadata('design:returntype', target, key)
        }

        registerDeps(targetMeta, target, key)
        return
      }
    }
  }
}

function registerDeps (targetMeta: ResolverMeta, target: any, key: any) {
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
