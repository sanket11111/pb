/**
 * @name chapter.js
 *
 * @summary Provides API for Chapters
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
  BaseController = require('./base-controller'),
  objectWrapper = require('../utils/objectWrapper'),
  Log = require('../utils/logger').getLogger();

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, TYPES, STATUS_TYPE } = require('../utils/constants');

/**
 * @class Chapter
 *
 * @summary Chapter Class for managing API for chapter component for user app
 *
 */

class Chapter extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get a single or all chapter
   *
   * @param {*}
   *    event: event triggers that cause the invocation of the lambda
   *
   * @returns list of the chapters
   */
  getAllChapter = async (event) => {
    try {
      const queryParam = event.queryStringParameters,
        chapterId = queryParam ? queryParam.chapterId : undefined,
        idQuery = chapterId ? { _id: ObjectId(chapterId) } : {};

      const gameType = queryParam ? queryParam.gameType : undefined,
        typeQuery = gameType ? { GameType: gameType } : {};

      const audience = queryParam ? queryParam.audience : undefined,
        audienceQuery = audience ? { Audience: audience } : {};

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.CHAPTER)
          .find({ ...idQuery, ...typeQuery, ...audienceQuery, ...{ published_at: { $ne: null } } })
          .sort({ order: 1 })
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
        //  const responseData = [];

        for (let i = 0; i < data.length; i++) {
          const videosArray = data[i].Videos || [],
            videosRef = videosArray.map((element) => element.ref);

          const videoComponentData = await this.connection
            .collection(COMPONENTS.VIDEO)
            .find({ _id: { $in: videosRef } })
            .toArray();

          const uploadChapterThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(data[i].ChapterThumbnail[0]) })
            .toArray();

          const videoResponse = [];

          for (let j = 0; j < videoComponentData.length; j++) {
            const uploadThumbnailData = await this.connection
              .collection(COLLECTIONS.UPLOADFILE)
              .find({ _id: ObjectId(videoComponentData[j].Thumbnail[0]) })
              .toArray();

            let youtubeUrl = null;
            if (videoComponentData[j].URL && videoComponentData[j].URL) {
              if (videoComponentData[j].URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                youtubeUrl = videoComponentData[j].URL;
              } else {
                youtubeUrl = `https://www.youtube.com/watch?v=` + videoComponentData[j].URL;
              }
            }

            videoResponse.push({
              id: `${videoComponentData[j]._id}`,
              videoTags: `${videoComponentData[j].VideoTags}`,
              thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
              title: `${videoComponentData[j].Title}`,
              url: `${youtubeUrl}`,
              duration: `${videoComponentData[j].Duration}`,
              description: `${videoComponentData[j].Description}`,
              order: videoComponentData[j].Order,
              type: TYPES.VIDEO,
            });
          }

          const quizArray = data[i].Quiz || [],
            quizRef = quizArray.map((element) => element.ref);

          const quizComponentData = await this.connection
            .collection(COMPONENTS.QUIZ)
            .find({ _id: { $in: quizRef } })
            .sort({ Order: 1 })
            .toArray();

          const quizData = [];
          const freeQuizData = await this.connection
            .collection(COLLECTIONS.QUIZ)
            .find({ chapter: data[i]._id })
            .sort({ Order: 1 })
            .toArray();

          for (let j = 0; j < freeQuizData.length; j++) {
            const questionCount = freeQuizData[j].MCQs.length;

            quizData.push({
              id: `${freeQuizData[j]._id}`,
              quizTitle: `${freeQuizData[j].QuizTitle}`,
              order: freeQuizData[j].Order,
              questionCount: questionCount,
              type: TYPES.QUIZ,
              isFree: true,
            });
          }

          for (let j = 0; j < quizComponentData.length; j++) {
            const questionCount = quizComponentData[j].AddMCQs.length;

            quizData.push({
              id: `${quizComponentData[j]._id}`,
              quizTitle: `${quizComponentData[j].QuizTitle}`,
              order: quizComponentData[j].Order,
              questionCount: questionCount,
              type: TYPES.QUIZ,
              isFree: false,
            });
          }

          for (let k = 0; k < quizData.length; k++) {
            const obj = quizData[k].questionCount;
            if (obj === 0) {
              quizData.splice(k, 1);
              k--;
            }
          }

          const videoAndQuiz = videoResponse.concat(quizData);
          videoAndQuiz.sort((a, b) => a.order - b.order);

          responseData.push({
            chapterId: `${data[i]._id}`,
            name: `${data[i].Title}`,
            description: `${data[i].Description}`,
            gameType: `${data[i].GameType}`,
            audience: `${data[i].Audience}`,
            thumbnail: `${uploadChapterThumbnailData[0] && uploadChapterThumbnailData[0].url}`,
            order: data[i].order,
            videoAndQuiz: videoAndQuiz,
          });
        }

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error(`getAllChapter::Error: ${err}`);

      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get a quiz details in Chapters
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a quiz details
   */

  getChapterQuizDetails = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        quizId = queryParam ? queryParam.quizId : undefined,
        query = { _id: ObjectId(quizId) };

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COMPONENTS.QUIZ)
          .find({ ...query })
          .toArray();
        if(!data.length) {
          data = await this.connection.collection(COLLECTIONS.QUIZ).find({ ...query, ...{ published_at: { $ne: null } }}).toArray();
        }
      } catch (err) {
        return this.generateResponseForError(
          STATUS_TYPE.FAIL,
          STATUS_CODES.INTERNAL_SERVER_ERROR,
          STATUS_MESSAGES.INTERNAL_SERVER_ERROR
        );
      }

      let responseData = [];
      if (data && data.length) {
        let questionData = [];

        for (let j = 0; j < data.length; j++) {
          const quizArray = data[j].AddMCQs || data[j].MCQs || [],
            quizRef = quizArray.map((ele) => ele.ref);

          const componentDevMcq = await this.connection
            .collection(COMPONENTS.MCQ)
            .find({ _id: { $in: quizRef } })
            .toArray();

          for (let i = 0; i < componentDevMcq.length; i++) {
            const options = [],
              correctOptions = [];

            correctOptions.push({
              1: componentDevMcq[i].is_ACorrect,
              2: componentDevMcq[i].is_Bcorrect,
              3: componentDevMcq[i].is_Ccorrect,
              4: componentDevMcq[i].is_Dcorrect,
              5: componentDevMcq[i].is_Ecorrect,
              6: componentDevMcq[i].is_Fcorrect,
              7: componentDevMcq[i].is_Gcorrect,
            });

            for (let k = 0; k < correctOptions.length; k++) {
              const obj = correctOptions[k];

              Object.keys(obj).forEach((key) => {
                if (obj[key] === 'undefined' || obj[key] === '' || obj[key] === 'null' || obj[key] === false) {
                  delete obj[key];
                }
              });
            }

            options.push(
              {
                optionId: '1',
                optionValue: `${componentDevMcq[i].OptionA}`,
                optionLabel: 'A',
              },
              {
                optionId: '2',
                optionValue: `${componentDevMcq[i].OptionB}`,
                optionLabel: 'B',
              },
              {
                optionId: '3',
                optionValue: `${componentDevMcq[i].OptionC}`,
                optionLabel: 'C',
              },
              {
                optionId: '4',
                optionValue: `${componentDevMcq[i].OptionD}`,
                optionLabel: 'D',
              },
              {
                optionId: '5',
                optionValue: `${componentDevMcq[i].OptionE}`,
                optionLabel: 'E',
              },
              {
                optionId: '6',
                optionValue: `${componentDevMcq[i].OptionF}`,
                optionLabel: 'F',
              },
              {
                optionId: '7',
                optionValue: `${componentDevMcq[i].OptionG}`,
                optionLabel: 'G',
              }
            );

            for (let k = 0; k < options.length; k++) {
              const obj = options[k].optionValue;
              if (obj === 'undefined' || obj === '' || obj === 'null') {
                options.splice(k, 1);
                k--;
              }
            }

            let uploadImageData, uploadThumbnailData, youtubeUrl = null;
            if (componentDevMcq[i].QuestionImage) {
              const imageId = componentDevMcq[i].QuestionImage;
              uploadImageData = await this.connection
                .collection(COLLECTIONS.UPLOADFILE)
                .find({ _id: ObjectId(imageId) })
                .toArray();
            }

            if (componentDevMcq[i].VideoThumbnail) {
              uploadThumbnailData = await this.connection
                .collection(COLLECTIONS.UPLOADFILE)
                .find({ _id: ObjectId(componentDevMcq[i].VideoThumbnail) })
                .toArray();
            }
            if (componentDevMcq[i].VideoURL) {
              if (componentDevMcq[i].VideoURL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                youtubeUrl = componentDevMcq[i].VideoURL;
              } else {
                youtubeUrl = `https://www.youtube.com/watch?v=` + componentDevMcq[i].VideoURL;
              }
            }

            questionData.push({
              questionId: `${componentDevMcq[i]._id}`,
              isMandatory: componentDevMcq[i].isMandatory,
              question: `${componentDevMcq[i].QuestionText}`,
              thumbnail: `${uploadThumbnailData && uploadThumbnailData[0].url}`,
              videoURL: `${youtubeUrl}`,
              image: `${uploadImageData && uploadImageData[0].url}`,
              options: options,
              solution: `${componentDevMcq[i].Solution}`,
              correctOptions: correctOptions[0],
            });

          }

          for (let k = 0; k < questionData.length; k++) {
            const obj = questionData[k];
            Object.keys(obj).forEach((key) => {
              if (obj[key] === 'undefined' || obj[key] === '' || obj[key] === 'null') {
                delete obj[key];
              }
            });
          }
          responseData.push({
            quizId: `${data[0]._id}`,
            questions: questionData,
          });
        }
        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.PARAMETER, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('FreeQuiz::Error in getFreeQuiz', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = Chapter;
