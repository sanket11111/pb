/**
 * @name myLearning.js
 *
 * @summary Provides API for myLearning
 *
 * @author Nikhil Aggarwal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
  BaseController = require('./base-controller'),
  objectWrapper = require('../utils/objectWrapper'),
  Log = require('../utils/logger').getLogger(),
  BLANK_SPACE = ' ',
  getSecretFun = require('../utils/secret-manager'),
  axios = require('axios');

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE, TYPES, COMPONENTS } = require('../utils/constants');

/**
 * @class MyLearning
 *
 * @summary MyLearning Class for managing API for myLearning
 *
 */

class MyLearning extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get userId from firebase token
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *
   * @returns the userId
   */

  getUserId = async (event) => {
    let userId;
    const FIREBASE_ENDPOINT = await getSecretFun.getSecrets('FirebaseEndpoint');
    const idToken = event.headers.Authorization.split(BLANK_SPACE)[1];
    return await axios
      .post(FIREBASE_ENDPOINT, {
        firebase_token: idToken,
      })
      .then((response) => {
        userId = response.data.data.cst_uid;
        return userId;
      });
  };

  /**
   * function to get myLearning
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all learning
   */

  getMyLearning = async (event, conn) => {
    try {
      // let userId = await this.getUserId(event);
      let userId = "1688119";
      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection.collection(COLLECTIONS.USER).find({ userId }).toArray();
      } catch (err) {
        return this.generateResponseForError(
          STATUS_TYPE.FAIL,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          STATUS_MESSAGES.INTERNAL_SERVER_ERROR
        );
      }

      let responseData = [];
      if (data && data.length) {
        let courseIdArray = data.map((ele) => ele.courseId.toString());
        courseIdArray = [...new Set(courseIdArray)];
        for(let i = 0; i < courseIdArray.length; i++){
          let course = null;
          if(courseIdArray[i] != 0){
          course = await this.connection
          .collection(COLLECTIONS.COURSE)
          .find({
            _id: ObjectId(courseIdArray[i]),
            ...{ published_at: { $ne: null } },
          })
          .toArray();
        }
          
          if((course && course.length) || courseIdArray[i] == 0){
          const chapterResponse = {};
          for (let j = 0; j < data.length; j++) {
            if (data[j].courseId == courseIdArray[i]) {
            const chapter =  await this.connection
              .collection(COLLECTIONS.CHAPTER)
              .find({
                _id: data[j].chapterId,
                ...{ published_at: { $ne: null } },
              })
              .toArray();
              if (((chapter && chapter.length) || data[j].chapterId == 0) && !chapterResponse[data[j].chapterId]) {
                chapterResponse[data[j].chapterId] = {
                  chapterId: data[j].chapterId,
                  quizProgress: [],
                  videoProgress: [],
                };
              }
              
              if (((chapter && chapter.length) || data[j].chapterId == 0) && data[j].componentType == TYPES.QUIZ) {
                
                const freeQuiz = await this.connection
                .collection(COLLECTIONS.QUIZ)
                .find({
                  _id: ObjectId(data[j].componentId),
                  ...{ published_at: { $ne: null } },
                })
                .toArray();
                
                const quiz = await this.connection
                .collection(COMPONENTS.QUIZ)
                .find({
                  _id: ObjectId(data[j].componentId)
                })
                .toArray();
                
                if((freeQuiz && freeQuiz.length) || (quiz && quiz.length)){
                chapterResponse[data[j].chapterId].quizProgress.push({
                  quizId: data[j].componentId,
                  status: data[j].progressData.status,
                  userAnswers: data[j].userAnswers,
                });
              }} else if (((chapter && chapter.length) || data[j].chapterId == 0) && data[j].componentType == TYPES.VIDEO) {

                const freeVideo = await this.connection
                .collection(COLLECTIONS.FREEVIDEO)
                .find({
                  _id: ObjectId(data[j].componentId),
                  ...{ published_at: { $ne: null } },
                })
                .toArray();
  
                const video = await this.connection
                .collection(COMPONENTS.VIDEO)
                .find({
                  _id: ObjectId(data[j].componentId)
                })
                .toArray();

                if((freeVideo && freeVideo.length) || (video && video.length)){
                chapterResponse[data[j].chapterId].videoProgress.push({
                  videoId: data[j].componentId,
                  status: data[j].progressData.status,
                });
              }}
            }
          }
          responseData.push({
            courseId: courseIdArray[i],
            chapterProgress: Object.values(chapterResponse),
          });
        }
      }

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      responseData = {status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('MyLearning::Error in getMyLearning', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = MyLearning;
