/**
 * @name lastSeen.js
 *
 * @summary Provides API for last seen video/quiz
 *
 * @author Rohit Ranjan
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

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE, TYPES } = require('../utils/constants');

/**
 * @class LastSeen
 *
 * @summary LastSeeng Class for managing API for lastSeen video/quiz
 */

class LastSeen extends BaseController {
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
   * function to post last seen video/quiz
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode with posted last seen video/quiz
   */

  postLastSeen = async (event, conn) => {
    if (!event.body) {
      return this.generateResponse(STATUS_CODES.RESOURCE_NOT_FOUND, STATUS_MESSAGES.NORECORD);
    }

    const { LastSeenData } = JSON.parse(event.body);

    try {
      this.connection = this.connection || conn;

      let data, userId;

      const idToken = event.headers.Authorization.split(BLANK_SPACE)[1];
      const FIREBASE_ENDPOINT = await getSecretFun.getSecrets('FirebaseEndpoint');

      await axios
        .post(FIREBASE_ENDPOINT, {
          firebase_token: idToken,
        })
        .then((response) => {
          userId = response.data.data.cst_uid;
        });

      if (LastSeenData && LastSeenData.length) {
        for (let i = 0; i < LastSeenData.length; i++) {
          if (LastSeenData[i].componentType == TYPES.QUIZ) {
            let chapterId, courseId;

            const mapperData = await this.connection
              .collection(COLLECTIONS.MAPPER)
              .find({ typeId: LastSeenData[i].componentId })
              .toArray();

            if (mapperData && mapperData.length) {
              chapterId = mapperData[0].chapterId;
              courseId = mapperData[0].courseId;
            } else {
              const mappingdata = await this.connection
                .collection(COLLECTIONS.CHAPTER)
                .find({ 'Quiz.ref': ObjectId(LastSeenData[i].componentId) })
                .sort({ order: 1 })
                .toArray();

              chapterId = mappingdata[0] ? mappingdata[0]._id : '0';
              courseId = mappingdata[0] ? mappingdata[0].course : '0';

              let typeId = LastSeenData[i].componentId,
                type = LastSeenData[i].componentType;

              const updateMapperData = await this.connection.collection(COLLECTIONS.MAPPER).insertOne({
                courseId,
                chapterId,
                typeId,
                type,
              });
            }

            let data1 = await this.connection
              .collection(COLLECTIONS.LASTSEEN)
              .deleteOne({ userId, courseId, componentType: LastSeenData[i].componentType });
            data = await this.connection.collection(COLLECTIONS.LASTSEEN).insertOne({
              userId,
              courseId,
              chapterId,
              componentId: LastSeenData[i].componentId,
              componentType: LastSeenData[i].componentType,
              progressData: LastSeenData[i].progressData,
              userAnswers: LastSeenData[i].userAnswers,
            });
          } else if (LastSeenData[i].componentType == TYPES.VIDEO) {
            let chapterId, courseId;

            const mapperData = await this.connection
              .collection(COLLECTIONS.MAPPER)
              .find({ typeId: LastSeenData[i].componentId })
              .toArray();

            if (mapperData && mapperData.length) {
              chapterId = mapperData[0].chapterId;
              courseId = mapperData[0].courseId;
            } else {
              const mappingdata = await this.connection
                .collection(COLLECTIONS.CHAPTER)
                .find({ 'Videos.ref': ObjectId(LastSeenData[i].componentId) })
                .sort({ order: 1 })
                .toArray();

              chapterId = mappingdata[0] ? mappingdata[0]._id : '0';
              courseId = mappingdata[0] ? mappingdata[0].course : '0';

              let typeId = LastSeenData[i].componentId,
                type = LastSeenData[i].componentType;

              const updateMapperData = await this.connection.collection(COLLECTIONS.MAPPER).insertOne({
                courseId,
                chapterId,
                typeId,
                type,
              });
            }

            courseId = courseId != '0' ? ObjectId(courseId) : courseId;
            chapterId = chapterId != '0' ? ObjectId(chapterId) : chapterId;

            let data1 = await this.connection
              .collection(COLLECTIONS.LASTSEEN)
              .deleteOne({ userId, courseId, componentType: LastSeenData[i].componentType });
            data = await this.connection.collection(COLLECTIONS.LASTSEEN).insertOne({
              userId,
              courseId,
              chapterId,
              componentId: LastSeenData[i].componentId,
              componentType: LastSeenData[i].componentType,
              progressData: LastSeenData[i].progressData,
            });
          }
        }

        return this.generateResponse(STATUS_CODES.SUCCESS, data.ops);
      }
    } catch (err) {
      Log.error('LastSeen::Error in postLastSeen', err);
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, err);
    }
  };

  /**
   * function to get LastSeen video/quiz
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the last seen video/quiz
   */

   getLastSeen = async (event, conn) => {
    try {
      let userId = await this.getUserId(event);

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection.collection(COLLECTIONS.LASTSEEN).find({ userId }).toArray();
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
        courseIdArray.forEach((element) => {
          const chapterResponse = {};
          for (let i = 0; i < data.length; i++) {
            if (data[i].courseId == element) {
              if (!chapterResponse[data[i].chapterId]) {
                chapterResponse[data[i].chapterId] = {
                  chapterId: data[i].chapterId,
                  quizProgress: [],
                  videoProgress: [],
                };
              }
              if (data[i].componentType == TYPES.QUIZ) {
                chapterResponse[data[i].chapterId].quizProgress.push({
                  quizId: data[i].componentId,
                  progress: data[i].progressData,
                  userAnswers: data[i].userAnswers,
                });
              } else if (data[i].componentType == TYPES.VIDEO) {
                chapterResponse[data[i].chapterId].videoProgress.push({
                  videoId: data[i].componentId,
                  progress: data[i].progressData,
                });
              } 
            }
          }
          responseData.push({
            courseId: element,
            chapterProgress: Object.values(chapterResponse),
          });
        });

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      responseData = { status: 'success', count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('LastSeen::Error in getLastSeen', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = LastSeen;
