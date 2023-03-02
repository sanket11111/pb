/**
 * @name controller.js
 *
 * @summary Validate the firebase token
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const axios = require('axios'),
  { STATUS_CODES, STATUS_MESSAGES } = require('../utils/constants');

module.exports.handler = async (event, context) => {
  // console.log("validator event", event)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': '*',
  };
  try {
    const idToken = event.idToken;

    await axios.post(event.FIREBASE_ENDPOINT, {
      firebase_token: idToken,
    });
    return {
      statusCode: STATUS_CODES.SUCCESS,
      headers: headers,
      body: JSON.stringify({
        message: STATUS_MESSAGES.AUTHORIZED,
      }),
    };
  } catch (err) {
    return {
      statusCode: STATUS_CODES.UNAUTHORIZED,
      headers: headers,
      body: JSON.stringify({
        message: STATUS_MESSAGES.INVALID_TOKEN,
      }),
    };
  }
};
