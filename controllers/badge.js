/**
 * @name badge.js
 *
 * @summary Provides API for Badge Configuration
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
  moment = require('moment'),
  axios = require('axios');

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, STATUS_TYPE, TYPES } = require('../utils/constants');

/**
 * @class Badge
 *
 * @summary Badge Class for managing API for badge component for user app
 *
 */
class Badge extends BaseController {
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
   * function to get user's login and signup data from firebase token
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *
   * @returns an object of login and signup info
   */
  getUserData = async (event) => {
    let result;
    const idToken = await event.headers.Authorization;
    const url = await getSecretFun.getSecrets('UserdataEndpoint');
    return await axios.get(url, {
      headers: { Authorization: idToken },
      params: { info_params: `['login_info']` }
    }).then((response) => {
      result = response.data.response;
      return result;
    })
  }

  /**
   * function to give a badge to the user
   * @param {*}
   *      event: event triggers that cause the invocation of the lambda
   *      conn: MongoDB connection object
   *
   */
  assignBadge = async (event, conn) => {
    this.connection = this.connection || conn;
    let userId = await this.getUserId(event);
    const userData = await this.getUserData(event);
    // let userId = "10456";
    // const userData = {
    //   login_info: { user_id: '10456', sign_up: 1418157734, login_date: 1670044704 }
    // };
    const data = await this.connection
      .collection(COLLECTIONS.STREAKS)
      .find({
        ...{ published_at: { $ne: null } },
      })
      .toArray();

    if (data && data.length) {
      for (let i = 0; i < data.length; i++) {
        const videoIds = data[i].free_lessons,
          quizIds = data[i].free_quizs,
          chapterIds = data[i].chapters;

        let isVideosCompleted = true, isQuizzesCompleted = true, isChaptersCompleted = true;
        if (videoIds && videoIds.length) {
          for (let j = 0; j < videoIds.length; j++) {
            const progressData = await this.connection
              .collection(COLLECTIONS.USER)
              .find({
                componentId: videoIds[j],
                userId,
                date: {
                  $lte: userData.login_info.sign_up + (data[i].streakNo * 604800000)
                },
                'progressData.status': 'completed',
              })
              .toArray();

            if (!progressData || !progressData.length) {
              isVideosCompleted = false;
            }
          }
        }
        if (quizIds && quizIds.length) {
          for (let j = 0; j < quizIds.length; j++) {
            const progressData = await this.connection
              .collection(COLLECTIONS.USER)
              .find({
                componentId: quizIds[j],
                userId,
                date: {
                  $lte: userData.login_info.sign_up + (data[i].streakNo * 604800000)
                },
                'progressData.status': 'completed',
              })
              .toArray();

            if (!progressData || !progressData.length) {
              isQuizzesCompleted = false;
            }
          }
        }
        if (chapterIds && chapterIds.length) {
          const chapterData = await this.connection
            .collection(COLLECTIONS.CHAPTER)
            .find({ _id: { $in: chapterIds }, ...{ published_at: { $ne: null } } })
            .sort({ order: 1 })
            .toArray();

          for (let j = 0; j < chapterData.length; j++) {
            const quizResponse = [],
              progressData = await this.connection
                .collection(COLLECTIONS.USER)
                .find({
                  chapterId: chapterData[j]._id,
                  userId,
                  date: {
                    $lte: userData.login_info.sign_up + (data[i].streakNo * 604800000)
                  },
                  'progressData.status': 'completed',
                })
                .toArray();

            const quizArray = chapterData[j].Quiz || [],
              quizRef = quizArray.map((ele) => ele.ref);

            const componentDevQuizzes = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: { $in: quizRef } })
              .toArray();

            for (let k = 0; k < componentDevQuizzes.length; k++) {
              quizResponse.push({
                questionCount: componentDevQuizzes[k].AddMCQs.length,
              });
            }
            const videoCount = chapterData[j].Videos.length,
              quizCount = chapterData[j].Quiz.length;

            for (let j = 0; j < quizResponse.length; j++) {
              const obj = quizResponse[j].questionCount;
              if (obj == 0) {
                quizCount -= 1;
              }
            }

            if (quizCount + videoCount != progressData.length) {
              isChaptersCompleted = false;
            }
          }
        }
        if (isVideosCompleted && isQuizzesCompleted && isChaptersCompleted) {
          const badgeData = await this.connection.collection(COLLECTIONS.REWARD).find({ streak: data[i]._id }).toArray();

          let userBadgeData = await this.connection.collection(COLLECTIONS.BADGEANDREWARD).update(
            {
              userId,
              badgeType: badgeData[0].Streak,
            },
            {
              userId,
              badgeType: badgeData[0].Streak,
              badge: badgeData[0].Badge_Name,
              reward: badgeData[0].Reward,
              message: badgeData[0].Message,
              note: badgeData[0].Note,
            },
            { upsert: true }
          );

          let responseData = {
            userId,
            badgeName: badgeData[0].Badge_Name,
            reward: badgeData[0].Reward,
            message: badgeData[0].Message,
            note: badgeData[0].Note,
          };
          return responseData;
        }
      };
    }
  };

  /**
   * function for Badge header stage
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the Badge header body
   */
  badgeHeader = async (event, conn) => {
    this.connection = this.connection || conn;
    // let userId = await this.getUserId(event);
    let userId = '10456';
    try {
      const rewards = await this.connection
        .collection(COLLECTIONS.REWARD)
        .find({
          ...{ published_at: { $ne: null } },
        })
        .toArray();

      const userReward = await this.connection
        .collection(COLLECTIONS.BADGEANDREWARD)
        .find({
          userId
        })
        .toArray();

      const responseData = { userId, ratio: `${userReward.length} / ${rewards.length}` };
      const finalResponse = await objectWrapper.objectWrapper(responseData);
      return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
    } catch (err) {
      Log.error('Badge: Error in :: badgeHeader', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * Welcome Badge API
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the Welcome Badge body
   */
  welcomeBadge = async (event, conn) => {
    this.connection = this.connection || conn;

    let userId = await this.getUserId(event);
    // let userId = "10456";
    let responseData = [];
    try {
      const badgeData = await this.connection.collection(COLLECTIONS.REWARD).find({}).toArray();

      for (let i = 0; i < badgeData.length; i++) {
        const userBadgeData = await this.connection.collection(COLLECTIONS.BADGEANDREWARD).find({ userId, badge: badgeData[i].Badge_Name }).toArray();

        if (userBadgeData && userBadgeData.length) {
          responseData.push({ badgeName: badgeData[i].Badge_Name, rewardMessage: 'This journey is completed.' });
        } else {
          const streakData = await this.connection
            .collection(COLLECTIONS.STREAKS)
            .find({
              _id: badgeData[i].streak,
              ...{ published_at: { $ne: null } },
            })
            .toArray();

          if (streakData && streakData.length) {
            let totalVideoCount = (streakData[0].free_lessons).length,
              totalQuizCount = (streakData[0].free_quizs).length,
              totalChapterCount = (streakData[0].chapters).length;

            const chapterData = await this.connection
              .collection(COLLECTIONS.CHAPTER)
              .find({ _id: { $in: (streakData[0].chapters) }, ...{ published_at: { $ne: null } } })
              .sort({ order: 1 })
              .toArray();
            for (let k = 0; k < chapterData.length; k++) {
              let quizResponse = [];
              const quizArray = chapterData[k].Quiz || [],
                quizRef = quizArray.map((ele) => ele.ref);

              const componentDevQuizzes = await this.connection
                .collection(COMPONENTS.QUIZ)
                .find({ _id: { $in: quizRef } })
                .toArray();

              for (let x = 0; x < componentDevQuizzes.length; x++) {
                quizResponse.push({
                  questionCount: componentDevQuizzes[x].AddMCQs.length,
                });
              }
              totalVideoCount = chapterData[k].Videos.length + totalVideoCount;
              for (let y = 0; y < quizResponse.length; y++) {
                const obj = quizResponse[y].questionCount;
                if (obj != 0) {
                  totalQuizCount = chapterData[k].Quiz.length + totalQuizCount;
                }
              }
            };

            responseData.push({
              badgeName: badgeData[i].Badge_Name,
              message: 'Complete the following to earn badge.',
              videoCount: totalVideoCount,
              quizCount: totalQuizCount,
              chapterCount: totalChapterCount
            });
          }
        }
      }
      const finalResponse = await objectWrapper.objectWrapper(responseData);
      return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
    } catch (err) {
      Log.error('Badge: Error in :: welcomeBadge', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * Badge detail API
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the Badge details
   */
  badgeDetail = async (event, conn) => {
    this.connection = this.connection || conn;
    const userData = await this.getUserData(event);
    // let userId = "10456";
    // const userData = {
    //   data: {
    //     login_info: { user_id: '10456', sign_up: 1673353546324, login_date: 1670044704 }
    //   }
    // };
    let userId = await this.getUserId(event);
    try {
      const badgeData = await this.connection.collection(COLLECTIONS.REWARD).find({ published_at: { $ne: null } }).toArray(),
        responseData = [];

      for (let i = 0; i < badgeData.length; i++) {
        const streakData = await this.connection
          .collection(COLLECTIONS.STREAKS)
          .find({
            _id: badgeData[i].streak,
            ...{ published_at: { $ne: null } },
          })
          .toArray();

        if (streakData && streakData.length) {
          let totalVideoCount = (streakData[0].free_lessons).length,
            totalQuizCount = (streakData[0].free_quizs).length,
            totalChapterCount = (streakData[0].chapters).length;

          const chapterData = await this.connection
            .collection(COLLECTIONS.CHAPTER)
            .find({ _id: { $in: (streakData[0].chapters) }, ...{ published_at: { $ne: null } } })
            .sort({ order: 1 })
            .toArray();

          for (let k = 0; k < chapterData.length; k++) {
            let quizResponse = [];
            const quizArray = chapterData[k].Quiz || [],
              quizRef = quizArray.map((ele) => ele.ref);

            const componentDevQuizzes = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: { $in: quizRef } })
              .toArray();

            for (let x = 0; x < componentDevQuizzes.length; x++) {
              quizResponse.push({
                questionCount: componentDevQuizzes[x].AddMCQs.length,
              });
            }
            totalVideoCount = chapterData[k].Videos.length + totalVideoCount;
            for (let y = 0; y < quizResponse.length; y++) {
              const obj = quizResponse[y].questionCount;
              if (obj != 0) {
                totalQuizCount = chapterData[k].Quiz.length + totalQuizCount;
              }
            }
          };

          const userBadgeData = await this.connection.collection(COLLECTIONS.BADGEANDREWARD).find({ userId, badge: badgeData[i].Badge_Name }).toArray();
          if (userBadgeData && userBadgeData.length) {
            responseData.push({
              badgeName: userBadgeData[0].badge,
              videoCount: totalVideoCount,
              quizCount: totalQuizCount,
              chapterCount: totalChapterCount,
              reward: userBadgeData[0].reward,
              message: 'This journey is completed.',
              note: userBadgeData[0].note,
              status: 'claimed'
            });
          } else if (userData.data.login_info.sign_up + ((streakData[0].streakNo - 1) * 604800000) < Date.now() && Date.now() < userData.data.login_info.sign_up + (streakData[0].streakNo * 604800000)) {
            const 
              toTime = moment(userData.data.login_info.sign_up + (streakData[0].streakNo * 604800000)),
              fromTime = moment(Date.now());
            let timeDiff = toTime.diff(fromTime, 'seconds'),
              hours = Math.floor(timeDiff / 3600);
            timeDiff %= 3600;
            let minutes = Math.floor(timeDiff / 60),
              seconds = timeDiff % 60;
            responseData.push({
              badgeName: badgeData[i].Badge_Name,
              videoCount: totalVideoCount,
              quizCount: totalQuizCount,
              chapterCount: totalChapterCount,
              message: `Complete all ${totalChapterCount} chapters, ${totalVideoCount} lessons and ${totalQuizCount} quizzes, to win ${badgeData[i].Badge_Name} and exciting rewards.`,
              timeLeft: `${hours}:${minutes}:${seconds}`,
              status: 'running'
            });
          } else if (userData.data.login_info.sign_up + (streakData[0].streakNo * 604800000) < Date.now() && Date.now() < userData.data.login_info.sign_up + (streakData[0].streakNo * 604800000)) {
            responseData.push({
              badgeName: badgeData[i].Badge_Name,
              videoCount: totalVideoCount,
              quizCount: totalQuizCount,
              chapterCount: totalChapterCount,
              message: `Complete all ${totalChapterCount} chapters, ${totalVideoCount} lessons and ${totalQuizCount} quizzes, to win ${badgeData[i].Badge_Name} and exciting rewards.`,
              status: 'available'
            });
          } else {
            responseData.push({
              badgeName: badgeData[i].Badge_Name,
              videoCount: totalVideoCount,
              quizCount: totalQuizCount,
              chapterCount: totalChapterCount,
              message: `Complete all ${totalChapterCount} chapters, ${totalVideoCount} lessons and ${totalQuizCount} quizzes, to win ${badgeData[i].Badge_Name} and exciting rewards.`,
              status: 'missed'
            });
          }
        }
      }
      const finalResponse = await objectWrapper.objectWrapper(responseData);
      return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
    } catch (err) {
      Log.error('Badge: Error in :: badgeDetail', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * Streak detail API
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns the Streak details
   */
  streakDetail = async (event, conn) => {
    this.connection = this.connection || conn;
    // let userId = "10456";
    let userId = await this.getUserId(event);
    try {
      const queryParam = event.queryStringParameters,
        streakId = queryParam ? queryParam.streakId : undefined;


      const streakData = await this.connection
        .collection(COLLECTIONS.STREAKS)
        .find({
          _id: ObjectId(streakId),
          ...{ published_at: { $ne: null } },
        })
        .toArray();

      if (streakData && streakData.length) {
        const responseData = [];
        let freeVideos = streakData[0].free_lessons,
          freeQuizzes = streakData[0].free_quizs,
          chapters = streakData[0].chapters;

        const chapterData = await this.connection
          .collection(COLLECTIONS.CHAPTER)
          .find({ _id: { $in: chapters }, ...{ published_at: { $ne: null } } })
          .sort({ order: 1 })
          .toArray();


        for (let i = 0; i < chapterData.length; i++) {

          const videosArray = chapterData[i].Videos || [],
            videosRef = videosArray.map((ele) => ele.ref);

          const quizArray = chapterData[i].Quiz || [],
            quizRef = quizArray.map((ele) => ele.ref);

          for (let j = 0; j < videosRef.length; j++) {
            let video = await this.connection
              .collection(COMPONENTS.VIDEO)
              .find({ _id: ObjectId(`${videosRef[j]}`) })
              .toArray();

            let isVideoCompleted = await this.connection
              .collection(COLLECTIONS.USER)
              .find({ userId, "progressData.status": "completed", "chapterId": ObjectId(chapterData[i]._id), "componentId": ObjectId(`${videosRef[j]}`) })
              .toArray();

            const imageId = video[0].Thumbnail[0],
              uploadImageData = await this.connection
                .collection(COLLECTIONS.UPLOADFILE)
                .find({ _id: ObjectId(imageId) })
                .toArray();

            let youtubeUrl = null;
            if (video[0].URL && video[0].URL.length) {
              if (video[0].URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                youtubeUrl = video[0].URL;
              } else {
                youtubeUrl = `https://www.youtube.com/watch?v=` + video[0].URL;
              }
            }

              responseData.push({
                id: `${video[0]._id}`,
                title: `${video[0].Title}`,
                url: `${youtubeUrl}`,
                description: `${video[0].Description}`,
                duration: `${video[0].Duration}`,
                videoThumbnail: `${uploadImageData[0].url}`,
                order: `${video[0].Order}`,
                type: TYPES.VIDEO,
                isCompleted: isVideoCompleted && isVideoCompleted.length,
              })
          }

          for (let j = 0; j < quizRef.length; j++) {
            let quiz = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: ObjectId(`${quizRef[j]}`) })
              .toArray();

            let isQuizCompleted = await this.connection
              .collection(COLLECTIONS.USER)
              .find({ userId, "progressData.status": "completed", "chapterId": ObjectId(chapterData[i]._id), "componentId": ObjectId(`${quizRef[j]}`) })
              .toArray();

              if (isQuizCompleted && isQuizCompleted.length) {
                responseData.push({
                  quizId: `${quiz[0]._id}`,
                  quizTitle: `${quiz[0].QuizTitle}`,
                  questionCount: quiz[0].AddMCQs.length,
                  order: `${quiz[0].Order}`,
                  type: TYPES.QUIZ,
                  isCompleted: quiz[0].AddMCQs && quiz[0].AddMCQs.length,
                })
            }
          }
        };

        const freeVideosData = await this.connection
          .collection(COLLECTIONS.FREEVIDEO)
          .find({ _id: { $in: freeVideos }, ...{ published_at: { $ne: null } } })
          .sort({ order: 1 })
          .toArray();

        for (let i = 0; i < freeVideosData.length; i++) {
          let isVideoCompleted = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ userId, "progressData.status": "completed", "componentId": ObjectId(`${freeVideosData[i]._id}`) })
            .toArray();

          const imageId = freeVideosData[i].VideoThumbnail,
            uploadImageData = await this.connection
              .collection(COLLECTIONS.UPLOADFILE)
              .find({ _id: ObjectId(imageId) })
              .toArray();

          let youtubeUrl = null;
          if (freeVideosData[i].VideoURL && freeVideosData[i].VideoURL.length) {
            if (freeVideosData[i].VideoURL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = freeVideosData[i].VideoURL;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + freeVideosData[i].VideoURL;
            }
          }

            responseData.push({
              id: `${freeVideosData[i]._id}`,
              title: `${freeVideosData[i].Title}`,
              url: `${youtubeUrl}`,
              description: `${freeVideosData[i].Description}`,
              duration: `${freeVideosData[i].Duration}`,
              videoThumbnail: `${uploadImageData[0].url}`,
              order: `${freeVideosData[i].Order}`,
              type: TYPES.VIDEO,
              isCompleted: isVideoCompleted && isVideoCompleted.length,
            })
        }

        const freeQuizData = await this.connection
          .collection(COLLECTIONS.QUIZ)
          .find({ _id: { $in: freeQuizzes }, ...{ published_at: { $ne: null } } })
          .sort({ Order: 1 })
          .toArray();

        for (let i = 0; i < freeQuizData.length; i++) {
          const questionCount = freeQuizData[i].MCQs.length;

          let isQuizCompleted = await this.connection
            .collection(COLLECTIONS.USER)
            .find({ userId, "progressData.status": "completed", "componentId": ObjectId(`${freeQuizData[i]._id}`) })
            .toArray();

          if (questionCount) {
              responseData.push({
                quizId: `${freeQuizData[i]._id}`,
                quizTitle: `${freeQuizData[i].QuizTitle}`,
                questionCount: freeQuizData[i].MCQs.length,
                order: `${freeQuizData[i].order}`,
                type: TYPES.QUIZ,
                isCompleted: isQuizCompleted && isQuizCompleted.length,
              })
          }
        }

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.PARAMETER, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('Badge: Error in :: streakDetail', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = Badge;