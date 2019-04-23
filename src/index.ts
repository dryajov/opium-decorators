import 'reflect-metadata'
import { Opium, LifeCycle, Dependency } from 'opium-ioc'

const OPIUM_META = Symbol.for('opium:meta')

enum ResolverType {
  TYPE,
  FACTORY,
  INSTANCE
}

class ResolverMeta {
  public id: any
  public reflectData: any
  public lifeCycle: LifeCycle = LifeCycle.SINGLETON
  public type: ResolverType = ResolverType.TYPE
  public deps: ResolverMeta[] = []
  public target: any
}

function isCommonType (name: string) {
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

function throwCommonType (typeName: string) {
  throw new Error(`type ${typeName} requires a custom identifier, consider annotating with @inject('my-id')`)
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
export function app (id?: any, lifeCycle?: LifeCycle): any {
  container = new Opium(id, lifeCycle)
  async function dep (target: any, key?: string, descriptor?: PropertyDescriptor) {
    // first inject the app itself
    const depFactory: Function = inject(target)
    if (depFactory) {
      depFactory(target, key, descriptor)
    }

    // now lets register everything with the container the deps graph
    const depMeta: ResolverMeta = Reflect.getMetadata(OPIUM_META, target)
    registerWithContainer(depMeta, container)
    const app: Dependency = container.getDep(depMeta.id)
    await app.inject()
    return target
  }

  typeof id === 'string' ? dep : dep(id)
}

export function inject (id?: any, lifeCycle?: LifeCycle): any {
  function dep (target: any, key?: string, descriptor?: PropertyDescriptor) {
    const resolverMeta: ResolverMeta = new ResolverMeta()
    resolverMeta.reflectData = Reflect.getMetadata('design:type', target)

    // set an id on the target if provided
    let typeName: string
    // id overrides the type name
    if (id) {
      typeName = typeof id.name === 'string' ? id.name : id
    } else {
      typeName = target.name
    }

    // set the dependency id
    resolverMeta.id = typeName

    // check that the type is not a common type
    if (isCommonType(typeName)) {
      throwCommonType(typeName)
    }

    // check that any of its dependencies has a unique identifier as well
    const deps: any[] = Reflect.getMetadata('design:paramtypes', target)
    deps.forEach((d: any) => {
      const depMeta: ResolverMeta = Reflect.getMetadata(OPIUM_META, d)
      isCommonType(depMeta.id) && throwCommonType(depMeta.id)
      resolverMeta.deps.push(depMeta)
    })

    // this is a class, register as a type
    if (typeof target === 'function' && !key && !descriptor) {
      resolverMeta.type = ResolverType.TYPE
    } else if (typeof target === 'function' && key && descriptor) {
      resolverMeta.type = ResolverType.FACTORY
    } else {
      resolverMeta.type = ResolverType.INSTANCE
    }

    resolverMeta.target = target
    resolverMeta.lifeCycle = lifeCycle || resolverMeta.lifeCycle

    // save the resolver metadata
    Reflect.defineMetadata(OPIUM_META, resolverMeta, target)
  }

  return typeof id === 'string'
    ? dep
    : dep(id)
}
