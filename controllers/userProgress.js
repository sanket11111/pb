/**
 * @name userProgress.js
 *
 * @summary Provides API for User Progress Management
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
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
  Badge = require('./badge'),
  axios = require('axios');

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, TYPES, STATUS_TYPE, COMPONENTS } = require('../utils/constants');

/**
 * @class UserProgress
 *
 * @summary UserProgress Class for managing API for user progress component for user app
 *
 */

class UserProgress extends BaseController {
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
   * function to get user progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the user progress
   */

  getAllUserProgress = async (event, conn) => {
    try {
      let userId = await this.getUserId(event);

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection.collection(COLLECTIONS.USER).find({ userId }).toArray();
      } catch (err) {
        return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.INTERNAL_SERVER_ERROR, STATUS_MESSAGES.INTERNAL_SERVER_ERROR);
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
                  status: data[i].progressData.status,
                  userAnswers: data[i].userAnswers,
                });
              } else if (data[i].componentType == TYPES.VIDEO) {
                chapterResponse[data[i].chapterId].videoProgress.push({
                  videoId: data[i].componentId,
                  status: data[i].progressData.status,
                  watchedTime: data[i].progressData.watchedTime,
                });
              }
            }
          }

          responseData.push({
            courseId: element,
            chapterProgress: Object.values(chapterResponse),
            completed: '',
          });
        });

        courseIdArray = courseIdArray.filter((i) => i != '0');
        courseIdArray = courseIdArray.map((e) => ObjectId(e));

        const courseProgressData = await this.connection
          .collection(COLLECTIONS.COURSEPROGRESS)
          .find({ userId, courseId: { $in: courseIdArray } })
          .toArray();

        if (courseProgressData && courseProgressData.length) {
          for (let k = 0; k < responseData.length; k++) {
            courseProgressData.forEach((ele) => {
              if (responseData[k].courseId == ele.courseId) {
                responseData[k].completed = ele.completed;
              }
            });
          }
        }

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      responseData = { status: 'success', count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('UserProgress::Error in getUserProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to post user progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode with posted user progress
   */

  postUserProgress = async (event, conn) => {
    if (!event.body) {
      return this.generateResponseWithError(
        STATUS_TYPE.FAIL,
        STATUS_CODES.DATA_NOT_AVAILABLE,
        STATUS_MESSAGES.DATA_NOT_AVAILABLE
      );
    }

    const { bulkData } = JSON.parse(event.body);

    try {
      this.connection = this.connection || conn;

      let data, isAvailable;
      const userId = await this.getUserId(event);

      let responseData = [];
      if (bulkData && bulkData.length) {
        let cid = 0;
        for (let i = 0; i < bulkData.length; i++) {
          if (bulkData[i].componentType == TYPES.QUIZ) {
            let chapterId, courseId;

            const mapperData = await this.connection
              .collection(COLLECTIONS.MAPPER)
              .find({ typeId: bulkData[i].componentId })
              .toArray();

            if (mapperData && mapperData.length) {
              chapterId = mapperData[0].chapterId;
              courseId = mapperData[0].courseId;
            } else {
              const mappingdata = await this.connection
                .collection(COLLECTIONS.CHAPTER)
                .find({ 'Quiz.ref': ObjectId(bulkData[i].componentId) })
                .sort({ order: 1 })
                .toArray();

              chapterId = mappingdata[0] ? mappingdata[0]._id : '0';
              courseId = mappingdata[0] ? mappingdata[0].course : '0';

              let typeId = bulkData[i].componentId,
                type = bulkData[i].componentType;

              const updateMapperData = await this.connection.collection(COLLECTIONS.MAPPER).insertOne({
                courseId,
                chapterId,
                typeId,
                type,
              });
            }

            courseId = courseId != '0' ? ObjectId(courseId) : courseId;
            chapterId = chapterId != '0' ? ObjectId(chapterId) : chapterId;
            cid = courseId;

            const isAvailable = await this.connection.collection(COLLECTIONS.USER).count({
              userId,
              courseId,
              chapterId,
              componentId: ObjectId(bulkData[i].componentId),
              componentType: bulkData[i].componentType,
            });

            if (isAvailable === 0) {
              data = await this.connection.collection(COLLECTIONS.USER).insertOne({
                userId,
                courseId,
                chapterId,
                date: Date.now(),
                componentId: ObjectId(bulkData[i].componentId),
                componentType: bulkData[i].componentType,
                progressData: bulkData[i].progressData,
                userAnswers: bulkData[i].userAnswers,
              });
            } else if (isAvailable === 1) {
              let a = await this.connection
                .collection(COLLECTIONS.USER)
                .find({ userId, componentId: ObjectId(bulkData[i].componentId) })
                .toArray();

              if (a[0].progressData.status == 'incompleted') {
                data = await this.connection.collection(COLLECTIONS.USER).updateOne(
                  { userId, componentId: ObjectId(bulkData[i].componentId) },
                  {
                    $set: {
                      userId,
                      courseId,
                      chapterId,
                      date: Date.now(),
                      componentId: ObjectId(bulkData[i].componentId),
                      componentType: bulkData[i].componentType,
                      progressData: bulkData[i].progressData,
                      userAnswers: bulkData[i].userAnswers,
                    },
                  }
                );
              } else {
                data = await this.connection.collection(COLLECTIONS.USER).updateOne(
                  { userId, componentId: ObjectId(bulkData[i].componentId) },
                  {
                    $set: {
                      userId,
                      courseId,
                      chapterId,
                      date: Date.now(),
                      componentId: ObjectId(bulkData[i].componentId),
                      componentType: bulkData[i].componentType,
                      userAnswers: bulkData[i].userAnswers,
                    },
                  }
                );
              }
            }
          } else if (bulkData[i].componentType == TYPES.VIDEO) {
            let chapterId, courseId;

            const mapperData = await this.connection
              .collection(COLLECTIONS.MAPPER)
              .find({ typeId: bulkData[i].componentId })
              .toArray();

            if (mapperData && mapperData.length) {
              chapterId = mapperData[0].chapterId;
              courseId = mapperData[0].courseId;
            } else {
              const mappingdata = await this.connection
                .collection(COLLECTIONS.CHAPTER)
                .find({ 'Videos.ref': ObjectId(bulkData[i].componentId) })
                .sort({ order: 1 })
                .toArray();

              chapterId = mappingdata[0] ? mappingdata[0]._id : '0';
              courseId = mappingdata[0] ? mappingdata[0].course : '0';

              let typeId = bulkData[i].componentId,
                type = bulkData[i].componentType;

              const updateMapperData = await this.connection.collection(COLLECTIONS.MAPPER).insertOne({
                courseId,
                chapterId,
                typeId,
                type,
              });
            }

            courseId = courseId != '0' ? ObjectId(courseId) : courseId;
            chapterId = chapterId != '0' ? ObjectId(chapterId) : chapterId;
            cid = courseId;

            const isAvailable = await this.connection.collection(COLLECTIONS.USER).count({
              userId,
              courseId,
              chapterId,
              componentId: ObjectId(bulkData[i].componentId),
              componentType: bulkData[i].componentType,
            });

            if (isAvailable === 0) {
              data = await this.connection.collection(COLLECTIONS.USER).insertOne({
                userId,
                courseId,
                chapterId,
                date: Date.now(),
                componentId: ObjectId(bulkData[i].componentId),
                componentType: bulkData[i].componentType,
                progressData: bulkData[i].progressData,
              });
            } else if (isAvailable === 1) {
              let a = await this.connection
                .collection(COLLECTIONS.USER)
                .find({ userId, componentId: ObjectId(bulkData[i].componentId) })
                .toArray();

              if (a[0].progressData.status == 'incompleted') {
                data = await this.connection.collection(COLLECTIONS.USER).updateOne(
                  { userId, componentId: ObjectId(bulkData[i].componentId) },
                  {
                    $set: {
                      userId,
                      courseId,
                      chapterId,
                      date: Date.now(),
                      componentId: ObjectId(bulkData[i].componentId),
                      componentType: bulkData[i].componentType,
                      progressData: bulkData[i].progressData,
                    },
                  }
                );
              } else {
                data = await this.connection.collection(COLLECTIONS.USER).updateOne(
                  { userId, componentId: ObjectId(bulkData[i].componentId) },
                  {
                    $set: {
                      userId,
                      courseId,
                      chapterId,
                      date: Date.now(),
                      componentId: ObjectId(bulkData[i].componentId),
                      componentType: bulkData[i].componentType,
                      'progressData.watchedTime': bulkData[i].progressData.watchedTime,
                    },
                  }
                );
              }
            }
          }

          let badgeData = await new Badge().assignBadge(event, this.connection);

          if (badgeData) {
            responseData.push(badgeData);
            responseData = Array.from(new Set(responseData.map(JSON.stringify))).map(JSON.parse)
          }
        }

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      } else {
        return this.generateResponseForError(
          STATUS_TYPE.SUCCESS,
          STATUS_CODES.DATA_NOT_AVAILABLE,
          STATUS_MESSAGES.NORECORD
        );
      }
    } catch (err) {
      Log.error('UserProgress::Error in postUserProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get user's quiz progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode and the data
   */

  getQuizProgress = async (event, conn) => {
    try {
      const quizIdQuery = event.queryStringParameters ? event.queryStringParameters.quizId : undefined;

      let userId = await this.getUserId(event);

      if (quizIdQuery) {
        let data;
        try {
          data = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ ...{ userId }, ...{ componentId: quizIdQuery } })
            .toArray();
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }

        let responseData = [];
        if (data && data.length) {
          // let responseData = [];

          responseData.push({
            quizId: `${data[0].componentId}`,
            status: data[0].progressData.status,
            userAnswers: data[0].userAnswers,
          });
          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
        responseData = { status: 'success', count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('UserProgress::Error in getQuizProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get user's video progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode and the data
   */

  getVideoProgress = async (event, conn) => {
    try {
      const videoIdQuery = event.queryStringParameters ? event.queryStringParameters.videoId : undefined;

      let userId = await this.getUserId(event);

      if (videoIdQuery) {
        let data;
        try {
          data = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ ...{ userId }, ...{ componentId: videoIdQuery } })
            .toArray();
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }

        let responseData = [];
        if (data && data.length) {
          // let responseData = [];

          responseData.push({
            videoId: `${data[0].componentId}`,
            status: data[0].progressData.status,
          });
          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
        responseData = { status: 'success', count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('UserProgress::Error in getVideoProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get user's chapter progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode and the data
   */

  getChapterProgress = async (event, conn) => {
    try {
      const chapterIdQuery = event.queryStringParameters.chapterId;

      let userId = await this.getUserId(event);

      if (chapterIdQuery) {
        const chapterId = chapterIdQuery !== '0' ? ObjectId(chapterIdQuery) : chapterIdQuery;

        let data;
        try {
          data = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ ...{ userId }, ...{ chapterId } })
            .toArray();
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }

        let responseData = [];
        if (data && data.length) {
          let quizResponse = [],
            videoResponse = [];

          for (let i = 0; i < data.length; i++) {
            if (data[i].componentType == TYPES.QUIZ) {
              quizResponse.push({
                quizId: `${data[i].componentId}`,
                status: data[i].progressData.status,
                userAnswers: data[i].userAnswers,
              });
            } else if (data[i].componentType == TYPES.VIDEO) {
              videoResponse.push({
                videoId: `${data[i].componentId}`,
                status: data[i].progressData.status,
              });
            }
          }
          responseData.push({
            chapterId: `${chapterIdQuery}`,
            quizProgress: quizResponse,
            videoProgress: videoResponse,
          });
          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
        responseData = { status: 'success', count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('UserProgress::Error in getChapterProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get user's course progress
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode and the data
   */

  getCourseProgress = async (event, conn) => {
    try {
      const courseIdQuery = event.queryStringParameters ? event.queryStringParameters.courseId : undefined;

      let userId = await this.getUserId(event);
      // let userId = '10106';

      if (courseIdQuery) {
        const courseId = courseIdQuery !== '0' ? ObjectId(courseIdQuery) : courseIdQuery;

        let data;
        try {
          data = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ ...{ userId }, ...{ courseId } })
            .toArray();
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }

        let responseData = [];
        if (data && data.length) {
          let chapterResponse = [];
          // let responseData = [];

          let chapterIdArray = data.map((ele) => ele.chapterId.toString());
          chapterIdArray = [...new Set(chapterIdArray)];

          chapterIdArray.forEach((element) => {
            let quizResponse = [];
            let videoResponse = [];
            let chapterId;

            for (let i = 0; i < data.length; i++) {
              if (data[i].chapterId == element) {
                if (data[i].componentType == TYPES.QUIZ) {
                  quizResponse.push({
                    quizId: `${data[i].componentId}`,
                    status: data[i].progressData.status,
                    userAnswers: data[i].userAnswers,
                  });
                } else if (data[i].componentType == TYPES.VIDEO) {
                  videoResponse.push({
                    videoId: `${data[i].componentId}`,
                    status: data[i].progressData.status,
                  });
                }
                chapterId = data[i].chapterId;
              }
            }
            chapterResponse.push({
              chapterId: chapterId,
              quizprogress: quizResponse,
              videoProgress: videoResponse,
            });
          });
          responseData.push({
            courseId: `${courseId}`,
            chapterProgress: chapterResponse,
          });
          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
        responseData = { status: 'success', count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('UserProgress::Error in getCourseProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to post user feedback
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode with posted user feedback
   */

  postUserFeedback = async (event, conn) => {
    if (!event.body) {
      return this.generateResponseForError(
        STATUS_TYPE.FAIL,
        STATUS_CODES.DATA_NOT_AVAILABLE,
        STATUS_MESSAGES.DATA_NOT_AVAILABLE
      );
    }

    const { videoId, individualRating } = JSON.parse(event.body);

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

      let isAvailable;
      try {
        isAvailable = await this.connection.collection(COLLECTIONS.FEEDBACK).countDocuments({ userId, videoId });
      } catch (err) {
        return this.generateResponseForError(
          STATUS_TYPE.FAIL,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          STATUS_MESSAGES.INTERNAL_SERVER_ERROR
        );
      }

      if (isAvailable === 0) {
        try {
          data = await this.connection.collection(COLLECTIONS.FEEDBACK).insertOne({
            userId,
            videoId,
            individualRating,
          });
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }
        let responseData = { status: STATUS_TYPE.SUCCESS, data: STATUS_MESSAGES.UPDATE };
        return this.generateResponse(STATUS_CODES.CREATED, responseData);
      } else {
        try {
          data = await this.connection.collection(COLLECTIONS.FEEDBACK).updateOne(
            { userId, videoId },
            {
              $set: {
                individualRating,
              },
            }
          );
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }
        let responseData = { status: STATUS_TYPE.SUCCESS, data: STATUS_MESSAGES.UPDATE };
        return this.generateResponse(STATUS_CODES.CREATED, responseData);
      }
      // return this.generateResponse(STATUS_CODES.SUCCESS, data.ops);
    } catch (err) {
      Log.error('UserProgress::Error in postUserFeedback', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get user feedback
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the statusCode with get user feedback
   */

  getUserFeedback = async (event, conn) => {
    try {
      const videoIdQuery = event.queryStringParameters ? event.queryStringParameters.videoId : undefined;

      let userId = await this.getUserId(event);

      if (videoIdQuery) {
        let data;
        try {
          data = await this.connection
            .collection(COLLECTIONS.FEEDBACK)
            .find({ ...{ userId }, ...{ videoId: videoIdQuery } })
            .toArray();
        } catch (err) {
          return this.generateResponseForError(
            STATUS_TYPE.FAIL,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            STATUS_MESSAGES.INTERNAL_SERVER_ERROR
          );
        }

        let responseData = [];
        if (data && data.length) {
          // let responseData = [];
          let sum = 0;

          const globalRating = await this.connection
            .collection(COLLECTIONS.FEEDBACK)
            .find({ videoId: videoIdQuery })
            .toArray();

          for (let i = 0; i < globalRating.length; i++) {
            sum = sum + globalRating[i].individualRating;
          }

          const average = sum / globalRating.length;

          responseData.push({
            videoId: `${data[0].videoId}`,
            individualRating: data[0].individualRating,
            globalRating: average,
          });
          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
        responseData = { status: 'success', count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
      return this.generateResponse(STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('UserProgress::Error in getUserFeedback', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
 * function to get user's incomplete course progress
 *
 * @param {*}
 *        event: event triggers that cause the invocation of the lambda
 *        conn: MongoDB connection object
 *
 * @returns the statusCode and the data
 */

  getIncompleteCourseProgress = async (event, conn) => {
    this.connection = this.connection || conn;
    try {
      const userId = await this.getUserId(event),
        inCompletedData = await this.connection
          .collection(COLLECTIONS.USER)
          .find({ userId, "progressData.status": "Incomplete" })
          .toArray();

      let courseIds = inCompletedData.filter((ele) => ele.courseId != '0').map((ele) => ele.courseId);
      courseIds = [...new Set(courseIds)]

      const inCompleteCourse = await this.connection
        .collection(COLLECTIONS.COURSE)
        .find({
          _id: { $in: courseIds },
          published_at: { $ne: null },
        })
        .sort({ order: 1 })
        .toArray();

      let responseData = [];
      if (inCompleteCourse && inCompleteCourse.length) {

        for (let i = 0; i < inCompleteCourse.length; i++) {
          const chapterData = await this.connection
            .collection(COLLECTIONS.CHAPTER)
            .find({ course: inCompleteCourse[i]._id, ...{ published_at: { $ne: null } } })
            .sort({ order: 1 })
            .toArray();

          const uploadThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(inCompleteCourse[i].Thumbnail) })
            .toArray();

          let
            videoAndQuiz = [],
            chapterResponse = [];

          for (let j = 0; j < chapterData.length; j++) {
            let videoResponse = [],
              quizResponse = [];

            const videosArray = chapterData[j].Videos || [],
              videosRef = videosArray.map((ele) => ele.ref);

            for (let k = 0; k < videosRef.length; k++) {
              let isVideoCompleted = await this.connection
                .collection(COLLECTIONS.USER)
                .find({ userId, "progressData.status": "completed", "courseId": inCompleteCourse[i]._id, "chapterId": chapterData[j]._id, "componentId": `${videosRef[k]}` })
                .toArray();

              if (isVideoCompleted && isVideoCompleted.length) {
                videosRef.splice(k, 1);
                k--;
              }
            }

            const quizArray = chapterData[j].Quiz || [],
              quizRef = quizArray.map((ele) => ele.ref);

            const componentDevVideos = await this.connection
              .collection(COMPONENTS.VIDEO)
              .find({ _id: { $in: videosRef } })
              .sort({ order: 1 })
              .toArray();

            for (let k = 0; k < quizRef.length; k++) {
              let isQuizCompleted = await this.connection
                .collection(COLLECTIONS.USER)
                .find({ userId, "progressData.status": "completed", "courseId": inCompleteCourse[i]._id, "chapterId": chapterData[j]._id, "componentId": `${quizRef[k]}` })
                .toArray();

              if (isQuizCompleted && isQuizCompleted.length) {
                quizRef.splice(k, 1);
                k--;
              }
            }

            const componentDevQuizzes = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: { $in: quizRef } })
              .sort({ order: 1 })
              .toArray();

            for (let x = 0; x < componentDevQuizzes.length; x++) {
              quizResponse.push({
                quizId: `${componentDevQuizzes[x]._id}`,
                quizTitle: `${componentDevQuizzes[x].QuizTitle}`,
                questionCount: componentDevQuizzes[x].AddMCQs.length,
                order: `${componentDevQuizzes[x].Order}`,
                type: TYPES.QUIZ,
                isFree: false,
              });
            }
            for (let k = 0; k < quizResponse.length; k++) {
              const obj = quizResponse[k].questionCount;
              if (obj === 0) {
                quizResponse.splice(k, 1);
                k--;
              }
            }

            for (let k = 0; k < componentDevVideos.length; k++) {
              const imageId = componentDevVideos[k].Thumbnail[0],
                uploadImageData = await this.connection
                  .collection(COLLECTIONS.UPLOADFILE)
                  .find({ _id: ObjectId(imageId) })
                  .toArray();

              let youtubeUrl = null;
              if (componentDevVideos[k].URL && componentDevVideos[k].URL.length) {
                if (componentDevVideos[k].URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                  youtubeUrl = componentDevVideos[k].URL;
                } else {
                  youtubeUrl = `https://www.youtube.com/watch?v=` + componentDevVideos[k].URL;
                }
              }

              videoResponse.push({
                id: `${componentDevVideos[k]._id}`,
                title: `${componentDevVideos[k].Title}`,
                url: `${youtubeUrl}`,
                description: `${componentDevVideos[k].Description}`,
                duration: `${componentDevVideos[k].Duration}`,
                videoThumbnail: `${uploadImageData[0].url}`,
                order: `${componentDevVideos[k].Order}`,
                type: TYPES.VIDEO,
              });
            }
            videoAndQuiz = videoResponse.concat(quizResponse);
            videoAndQuiz.sort((a, b) => a.order - b.order);

            chapterResponse.push({
              chapterId: `${chapterData[j]._id}`,
              title: `${chapterData[j].Title}`,
              description: `${chapterData[j].Description}`,
              videoAndQuiz: videoAndQuiz,
            });
          }
          for (let k = 0; k < chapterResponse.length; k++) {
            const obj = chapterResponse[k].videoAndQuiz.length;
            if (obj === 0) {
              chapterResponse.splice(k, 1);
              k--;
            }
          }

          responseData.push({
            courseId: `${inCompleteCourse[i]._id}`,
            name: `${inCompleteCourse[i].Name}`,
            description: `${inCompleteCourse[i].Description}`,
            type: `${inCompleteCourse[i].Type}`,
            language: `${inCompleteCourse[i].Language}`,
            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
            chapterData: chapterResponse,
          });

          for (let k = 0; k < responseData.length; k++) {
            const obj = responseData[k].chapterCount;
            if (obj === 0) {
              responseData.splice(k, 1);
              k--;
            }
          }
        }
        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      const finalResponse = await objectWrapper.objectWrapper([]);
      return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
    } catch (err) {
      Log.error('UserProgress::Error in getIncompleteCourseProgress', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = UserProgress;
