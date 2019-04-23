import 'reflect-metadata'
import { Opium, LifeCycle, Dependency } from 'opium-ioc'

const OPIUM_ID = Symbol.for('opium:meta:id')

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

let container: Opium
export function app (id?: any, lifeCycle?: LifeCycle): any {
  container = new Opium(id, lifeCycle)
  async function dep (target: any, key?: string, descriptor?: PropertyDescriptor) {
    const depFactory: Function = inject(target)(target, key, descriptor)
    depFactory(target, key, descriptor)
    const depName: any = Reflect.getMetadata(OPIUM_ID, target)
    const dep: Dependency = container.getDep(depName)
    await dep.inject()
  }

  return typeof id === 'string' ? dep : dep(id)
}

export function inject (id?: any, lifeCycle?: LifeCycle): any {
  function dep (target: any, key?: string, descriptor?: PropertyDescriptor) {
    const type: any = Reflect.getMetadata('design:type', target)
    // set an id on the target if provided
    let typeName: string
    if (id) {
      typeName = typeof id.name === 'string' ? id.name : id
    } else {
      typeName = target.name
    }

    // save the type name as metadata
    Reflect.defineMetadata(OPIUM_ID, typeName, target)

    // check that the type is not a common type
    if (isCommonType(typeName)) {
      throwCommonType(typeName)
    }

    // check that any of its dependencies has a unique identifier as well
    const depNames = Reflect.getMetadata('design:paramtypes', target)
    depNames.forEach((d: any) => {
      const name = Reflect.getMetadata(OPIUM_ID, d)
      isCommonType(name) && throwCommonType(name)
    })

    // this is a class, register as a type
    if (typeof target === 'function' && !key && !descriptor) {
      container.registerType(typeName, target, depNames, lifeCycle)
    } else if (typeof target === 'function' && key && descriptor) {
      container.registerFactory(typeName, target, depNames, lifeCycle)
    } else {
      container.registerInstance(typeName, target, depNames, lifeCycle)
    }
  }

  return typeof id === 'string'
  ? dep
  : dep(id)
}
