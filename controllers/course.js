/**
 * @name course.js
 *
 * @summary Provides API for Courses
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

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, TYPES, STATUS_TYPE } = require('../utils/constants');

/**
 * @class Course
 *
 * @summary Course Class for managing API for course component for user app
 *
 */

class Course extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get all courses
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all courses
   */

  getAllCourse = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        courseId = queryParam ? queryParam.courseId : undefined,
        idQuery = courseId ? { _id: ObjectId(courseId) } : {};

      const type = queryParam ? queryParam.type : undefined,
        typeQuery = type ? { Type: type } : {};

      const language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.COURSE)
          .find({
            ...idQuery,
            ...typeQuery,
            ...languageQuery,
            ...{ published_at: { $ne: null } },
          })
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

        for (let i = 0; i < data.length; i++) {
          const chapterData = await this.connection
            .collection(COLLECTIONS.CHAPTER)
            .find({ course: data[i]._id, ...{ published_at: { $ne: null } } })
            .sort({ order: 1 })
            .toArray();

          const uploadThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(data[i].Thumbnail) })
            .toArray();

          let videoCount = 0,
            quizResponse = [];

          for (let j = 0; j < chapterData.length; j++) {
            videoCount = chapterData[j].Videos.length + videoCount;

            const freeQuiz = await this.connection
              .collection(COLLECTIONS.QUIZ)
              .find({ chapter: chapterData[j]._id })
              .sort({ order: 1 })
              .toArray();

            const quizArray = chapterData[j].Quiz || [],
              quizRef = quizArray.map((ele) => ele.ref);

            const componentDevQuizzes = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: { $in: quizRef } })
              .sort({ order: 1 })
              .toArray();

            for (let x = 0; x < componentDevQuizzes.length; x++) {
              quizResponse.push({
                quizId: `${componentDevQuizzes[x]._id}`,
                questionCount: componentDevQuizzes[x].AddMCQs.length,
              });
            }

            for (let x = 0; x < freeQuiz.length; x++) {
              quizResponse.push({
                quizId: `${freeQuiz[x]._id}`,
                questionCount: freeQuiz[x].MCQs.length,
              });
            }
            for (let k = 0; k < quizResponse.length; k++) {
              const obj = quizResponse[k].questionCount;
              if (obj === 0) {
                quizResponse.splice(k, 1);
                k--;
              }
            }
          }

          responseData.push({
            courseId: `${data[i]._id}`,
            name: `${data[i].Name}`,
            description: `${data[i].Description}`,
            type: `${data[i].Type}`,
            language: `${data[i].Language}`,
            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
            chapterCount: chapterData.length,
            videoCount: parseInt(videoCount),
            quizCount: parseInt(quizResponse.length),
          });

          for (let k = 0; k < responseData.length; k++) {
            const obj = responseData[k].chapterCount;
            if (obj === 0) {
              responseData.splice(k, 1);
              k--;
            }
          }
        }
        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'courses', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('Course: Error in :: getAllCourse', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get all courses Details
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all courses with details
   */

  getAllCourseDetails = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        courseId = queryParam ? queryParam.courseId : undefined,
        idQuery = courseId ? { _id: ObjectId(courseId) } : {};

      const type = queryParam ? queryParam.type : undefined,
        typeQuery = type ? { Type: type } : {};

      const language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.COURSE)
          .find({
            ...idQuery,
            ...typeQuery,
            ...languageQuery,
            ...{ published_at: { $ne: null } },
          })
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
          const chapterData = await this.connection
            .collection(COLLECTIONS.CHAPTER)
            .find({ course: data[i]._id, ...{ published_at: { $ne: null } } })
            .sort({ order: 1 })
            .toArray();

          const uploadThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(data[i].Thumbnail) })
            .toArray();

          let videoCount = 0,
            quizCount = 0,
            videoAndQuiz = [],
            chapterResponse = [];

          for (let j = 0; j < chapterData.length; j++) {
            let videoResponse = [],
              quizResponse = [];

            videoCount = chapterData[j].Videos.length + videoCount;

            const videosArray = chapterData[j].Videos || [],
              videosRef = videosArray.map((ele) => ele.ref);

            const quizArray = chapterData[j].Quiz || [],
              quizRef = quizArray.map((ele) => ele.ref);

            const componentDevVideos = await this.connection
              .collection(COMPONENTS.VIDEO)
              .find({ _id: { $in: videosRef } })
              .sort({ order: 1 })
              .toArray();

            const componentDevQuizzes = await this.connection
              .collection(COMPONENTS.QUIZ)
              .find({ _id: { $in: quizRef } })
              .sort({ order: 1 })
              .toArray();

            const freeQuizData = await this.connection
              .collection(COLLECTIONS.QUIZ)
              .find({ chapter: chapterData[j]._id })
              .sort({ Order: 1 })
              .toArray();

            for (let x = 0; x < freeQuizData.length; x++) {
              const questionCount = freeQuizData[x].MCQs.length;

              quizResponse.push({
                quizId: `${freeQuizData[x]._id}`,
                quizTitle: `${freeQuizData[x].QuizTitle}`,
                order: freeQuizData[x].Order,
                questionCount: questionCount,
                type: TYPES.QUIZ,
                isFree: true,
              });
            }

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

            quizCount = quizCount + quizResponse.length;
          }

          responseData.push({
            courseId: `${data[i]._id}`,
            name: `${data[i].Name}`,
            description: `${data[i].Description}`,
            type: `${data[i].Type}`,
            language: `${data[i].Language}`,
            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
            chapterCount: chapterData.length,
            videoCount: parseInt(videoCount),
            quizCount: parseInt(quizCount),
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
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('Course: Error in :: getAllCourseDetails', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * function to get all cchapters of a particular course
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of chapters which belons to a particular course
   */

  getChapterForCourse = async (event) => {
    try {
      const queryParam = event.queryStringParameters,
        courseId = queryParam ? queryParam.courseId : undefined,
        query = { _id: ObjectId(courseId) },
        language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.COURSE)
          .find({
            ...query,
            ...languageQuery,
            ...{ published_at: { $ne: null } },
          })
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
        let totalVideoCount = 0;

        const uploadThumbnailData = await this.connection
          .collection(COLLECTIONS.UPLOADFILE)
          .find({ _id: ObjectId(data[0].Thumbnail) })
          .toArray();

        const chapterData = await this.connection
          .collection(COLLECTIONS.CHAPTER)
          .find({ course: data[0]._id, ...{ published_at: { $ne: null } } })
          .sort({ order: 1 })
          .toArray();

        let chapterResponse = [],
          quizCount = 0;

        for (let i = 0; i < chapterData.length; i++) {
          let videoCount = 0,
            quizResponse = [];
          videoCount = chapterData[i].Videos.length + videoCount;

          const uploadFileData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(chapterData[i].ChapterThumbnail) })
            .toArray();

          const freeQuiz = await this.connection
            .collection(COLLECTIONS.QUIZ)
            .find({ chapter: chapterData[i]._id })
            .sort({ order: 1 })
            .toArray();

          const quizArray = chapterData[i].Quiz || [],
            quizRef = quizArray.map((ele) => ele.ref);

          const componentDevQuizzes = await this.connection
            .collection(COMPONENTS.QUIZ)
            .find({ _id: { $in: quizRef } })
            .sort({ order: 1 })
            .toArray();

          for (let x = 0; x < freeQuiz.length; x++) {
            quizResponse.push({
              quizId: `${freeQuiz[x]._id}`,
              questionCount: freeQuiz[x].MCQs.length,
            });
          }

          for (let x = 0; x < componentDevQuizzes.length; x++) {
            quizResponse.push({
              quizId: `${componentDevQuizzes[x]._id}`,
              questionCount: componentDevQuizzes[x].AddMCQs.length,
            });
          }
          for (let k = 0; k < quizResponse.length; k++) {
            const obj = quizResponse[k].questionCount;
            if (obj === 0) {
              quizResponse.splice(k, 1);
              k--;
            }
          }

          chapterResponse.push({
            chapterId: `${chapterData[i]._id}`,
            chapterName: `${chapterData[i].Title}`,
            description: `${chapterData[i].Description}`,
            chapterThumbnail: `${uploadFileData[0].url}`,
            videoCount: videoCount,
            quizCount: parseInt(quizResponse.length),
          });
          quizCount = quizCount + quizResponse.length;
          totalVideoCount = chapterData[i].Videos.length + totalVideoCount;
        }
        responseData.push({
          courseId: `${data[0]._id}`,
          name: `${data[0].Name}`,
          description: `${data[0].Description}`,
          type: `${data[0].Type}`,
          language: `${data[0].Language}`,
          thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
          chapterCount: chapterResponse.length,
          videoCount: totalVideoCount,
          quizCount: quizCount,
          chapter: chapterResponse,
        });

        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.PARAMETER, STATUS_MESSAGES.PARAMETER);
    } catch (err) {
      Log.error('Course: Error in :: getChapterForCourse', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = Course;
