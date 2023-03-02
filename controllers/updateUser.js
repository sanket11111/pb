/**
 * @name updateUser.js
 *
 * @summary Provides lambda for User Progress Management
 *
 * @author Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const BaseController = require('./base-controller');

const { STATUS_CODES, COLLECTIONS, STATUS_TYPE, STATUS_MESSAGES } = require('../utils/constants');

class UserUpdate extends BaseController {
  constructor() {
    super(true);
  }
  userUpdate = async (event, conn) => {
    try {
      this.connection = this.connection || conn;
      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.USER)
          .find({ componentId: event.detail.fullDocument._id })
          .sort({ order: 1 })
          .toArray();
      } catch (err) {
        return this.generateResponseForError(
          STATUS_TYPE.FAIL,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          STATUS_MESSAGES.INTERNAL_SERVER_ERROR
        );
      }
      
      let x = event.detail.fullDocumentBeforeChange.AddMCQs || [];
      let y = event.detail.fullDocumentBeforeChange.MCQs || [];
      const oldLength = await (x.length || y.length);
      
      let u = event.detail.fullDocument.AddMCQs || [];
      let v = event.detail.fullDocument.MCQs || [];
      const newLength = await (u.length || v.length);
      
      if (data && data.length) {
        if (oldLength < newLength) {
          const savedData = await this.connection
            .collection(COLLECTIONS.USER)
            .updateMany(
              { componentId: event.detail.fullDocument._id },
              { $set: { 'progressData.status': 'incompleted' } }
            );
        } else {
          const newAddMCQsArray = event.detail.fullDocument.AddMCQs || [],
            newAddMCQsRef = newAddMCQsArray.map((ele) => ele.ref);

          const oldAddMCQsArray = event.detail.fullDocumentBeforeChange.AddMCQs || [],
            oldAddMCQsRef = oldAddMCQsArray.map((ele) => ele.ref);

          const newMCQsArray = event.detail.fullDocument.MCQs || [],
            newMCQsRef = newMCQsArray.map((ele) => ele.ref);

          const oldMCQsArray = event.detail.fullDocumentBeforeChange.MCQs || [],
            oldMCQsRef = oldMCQsArray.map((ele) => ele.ref);

          const deletedQuestions =
            oldAddMCQsRef.filter((id) => !newAddMCQsRef.includes(id)) ||
            oldMCQsRef.filter((id) => !newMCQsRef.includes(id));

          for (let i = 0; i < deletedQuestions.length; i++) {
            let savedData = await this.connection.collection(COLLECTIONS.USER).updateMany(
              { componentId: event.detail.fullDocument._id },
              {
                $unset: {
                  [`userAnswers.${deletedQuestions[i]}`]: '',
                },
              }
            );
          }
        }
      }
    } catch (err) {
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

exports.main = async function (event, context, callback) {
  const a = new UserUpdate();
  event.functionName = 'userUpdate';
  return await a.handler(event);
};
