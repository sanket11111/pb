/**
 * @name freeQuiz.js
 *
 * @summary Provides API for Free Quiz
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
  BaseController = require('./base-controller'),
  objectWrapper = require('../utils/objectWrapper'),
  objectWrapperWithHeader = require('../utils/objectWrapperWithHeader'),
  Log = require('../utils/logger').getLogger();

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, STATUS_TYPE } = require('../utils/constants');

/**
 * @class FreeQuiz
 *
 * @summary FreeQuiz Class for managing API for freequiz component for user app
 *
 */

class FreeQuiz extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get list of free quizzes
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all free quizzes
   */

  getAllFreeQuiz = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.QUIZ)
          .find({ ...languageQuery, ...{ published_at: { $ne: null } } })
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
        // const responseData = [];

        for (let i = 0; i < data.length; i++) {
          responseData.push({
            quizId: `${data[i]._id}`,
            quizTitle: `${data[i].QuizTitle}`,
            language: `${data[i].Language}`,
            questionCount: `${data[i].MCQs.length}`,
          });
        }

        for (let k = 0; k < responseData.length; k++) {
          const obj = responseData[k].questionCount;
          if (obj === 0) {
            responseData.splice(k, 1);
            k--;
          }
        }
        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'quizzes', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('FreeQuiz::Error in getAllFreeQuiz', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get a free quizzes
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a free quizzes
   */

  getFreeQuiz = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        quizId = queryParam ? queryParam.quizId : undefined,
        query = { _id: ObjectId(quizId) };

      const language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.QUIZ)
          .find({ ...languageQuery, ...query })
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
        // const responseData = [];
        const questionData = [];

        for (let j = 0; j < data.length; j++) {
          const freeQuizArray = data[j].MCQs || [],
            freeQuizRef = freeQuizArray.map((ele) => ele.ref);

          const componentDevMcq = await this.connection
            .collection(COMPONENTS.MCQ)
            .find({ _id: { $in: freeQuizRef } })
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
            language: `${data[0].Language}`,
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

module.exports = FreeQuiz;
