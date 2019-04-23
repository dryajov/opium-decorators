/* eslint-env mocha */

'use strict'

import * as chai from 'chai'
import dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

import { inject, app } from '../src'

describe('decorators', () => {
  it('should register class', (done) => {
    @inject
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    @app
    class MyApp {
      constructor (param1: MyClass) {
        expect(param1.greet).to.be.eq('hello world!')
        done()
      }
    }
  })

  it('should inject function', () => {
    class MyClass {
      @inject()
      func (param1: string) {
        console.log(`this is my class`, param1)
      }
    }
  })
})
