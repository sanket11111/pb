/**
 * @name base-controller.js
 *
 * @summary Base Controller for API Request/Respose Managment
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const Log = require('../utils/logger').getLogger(),
  db = require('../utils/db');
  // getSecretFun = require('../utils/secret-manager');

const { STATUS_CODES, STATUS_MESSAGES } = require('../utils/constants');

let gDBConnObj = null;

/**
 * @class BaseController
 *
 * @summary BaseController Class for managing all the base functions
 *
 */
class BaseController {
  constructor(useMongo = false) {
    this.connection = null;
    this.useMongo = useMongo;

    Log.level = process.env.logLevel || 'debug';
  }

  /**
   * function to process the API call
   *
   * @param {*}
   *      event: event triggers that cause the invocation of the lambda
   *      context: it contains the information about the invocation, function, and execution environment.
   *      callback: a function which is used to call in non-async handlers to send a response.
   *
   * @returns a response, error, or promise to the runtime instead of using callback
   */

  async process(event, context, callback) {
    return await eval('this.' + event.functionName)(event);
  }

  /**
   * function to handle the API call
   *
   * @param {*}
   *      event: event triggers that cause the invocation of the lambda
   *      context: it contains the information about the invocation, function, and execution environment.
   *      callback: a function which is used to call in non-async handlers to send a response.
   *
   * @returns a response, error, or promise to the runtime instead of using callback
   */

  // Instantiating base with Subclass Tag
  async handler(event, context, callback) {
    const DATABASE_NAME = 'poker-school';
    // const DATABASE_NAME = await getSecretFun.getSecrets('DatabaseName');
    Log.info(`BaseController::handler: ${JSON.stringify(event)}`);

    try {
      if (this.useMongo) {
        if (!gDBConnObj) {
          Log.info('BaseController::handler:Creating Mongo Client');
          gDBConnObj = await db.createConnection();
          Log.info('BaseController::handler: Connection created successfully');
        } else {
          Log.info('BaseController::handler: Using existing Mongo connection');
        }

        this.connection = gDBConnObj.db(DATABASE_NAME);
      }

      //calling process function of class instantiated
      try {
        const response = await this.process(event, context, callback);
        return response;
      } catch (err) {
        return this.callbackRespondWithSimpleMessage(
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          STATUS_MESSAGES.INTERNAL_SERVER_ERROR
        );
      }
    } catch (err) {
      Log.error(`BaseController::handler: Error ${err}`);

      await this.cleanup();

      return this.callbackRespondWithSimpleMessage(
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        STATUS_MESSAGES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * function to generate response of an API call
   * @param {*}
   *      statusCode: statuscode of the response
   *      body: the response
   *
   * @returns the statuscode with response body
   */

  async generateResponse(statusCode, body = '') {
    return {
      statusCode,
      body: JSON.stringify(body),
    };
  }

  /**
   * function to generate response of an API call for error
   * @param {*}
   *      status: fail/success
   *      statusCode: statuscode of the response
   *      body: the response
   *
   * @returns the statuscode with response body
   */

  generateResponseForError(status, statusCode, body = '') {
    const res = {
      status: status,
      error: [
        {
          code: statusCode,
          message: body,
        },
      ],
    };
    return {
      statusCode,
      body: JSON.stringify(res),
    };
  }

  /**
   * function to generate response of a callback with simple message
   *
   * @param {*}
   *      code: statuscode of the response
   *      message: the response message
   *
   * @returns the statuscode with response body
   */

  async callbackRespondWithSimpleMessage(code, message) {
    return {
      statusCode: code,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: message,
      }),
    };
  }

  /**
   * function to cleanup mongo connection
   */
  async cleanup() {
    if (this.useMongo && gDBConnObj) {
      // close connection to mongo
      await db.closeConnection(gDBConnObj);
      gDBConnObj = null;
      Log.info('Closed Mongo Connection Successfully');
    }
  }
}

module.exports = BaseController;
