/**
 * @name freeVideo.js
 *
 * @summary Provides API for Free Video
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

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE, COMPONENTS } = require('../utils/constants');

/**
 * @class FreeVideo
 *
 * @summary FreeVideo Class for managing API for freevideo component for user app
 *
 */

class FreeVideo extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get all free videos
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all free videos
   */

  getAllFreeVideo = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        lessonId = queryParam ? queryParam.lessonId : null,
        query = lessonId ? { _id: ObjectId(lessonId) } : {};

      const gameType = queryParam ? queryParam.gameType : undefined,
        gameTypeQuery = gameType ? { GameType: gameType } : {};

      const audience = queryParam ? queryParam.audience : undefined,
        audienceQuery = audience ? { Audience: audience } : {};

      const language = queryParam ? queryParam.language : undefined,
        languageQuery = language ? { Language: language } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.FREEVIDEO)
          .find({
            ...query,
            ...gameTypeQuery,
            ...audienceQuery,
            ...languageQuery,
            ...{ published_at: { $ne: null } },
          })
          .sort({ Order: 1 })
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
          const uploadThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(data[i].VideoThumbnail) })
            .toArray();

          let youtubeUrl = null;
          if (data[i].VideoURL && data[i].VideoURL.length) {
            if (data[i].VideoURL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = data[i].VideoURL;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + data[i].VideoURL;
            }
          }

          responseData.push({
            lessonId: `${data[i]._id}`,
            title: `${data[i].Title}`,
            audience: `${data[i].Audience}`,
            gameType: `${data[i].GameType}`,
            language: `${data[i].Language}`,
            order: data[i].Order,
            description: `${data[i].Description}`,
            videoURL: `${youtubeUrl}`,
            duration: `${data[i].Duration}`,
            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
          });
        }

        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'free_videos', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('FreeVideo::Error in getAllFreeVideo', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };

  /**
   * method to get all videos
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all videos
   */

  getAllVideos = async (event, conn) => {
    try {
      this.connection = this.connection || conn;

      let freeVideo = await this.connection
        .collection(COLLECTIONS.FREEVIDEO)
        .find({ ...{ published_at: { $ne: null } } })
        .sort({ Order: 1 })
        .toArray();

      let chaptersVideo = await this.connection
        .collection(COMPONENTS.VIDEO)
        .find({})
        .sort({ Order: 1 })
        .toArray();

      const data = freeVideo.concat(chaptersVideo);

      let responseData = [];
      if (data && data.length) {

        for (let i = 0; i < data.length; i++) {
          const thumbnailId = data[i].VideoThumbnail || (data[i].Thumbnail)[0];
          const uploadThumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(thumbnailId) })
            .toArray();

          let youtubeUrl = null;
          if (data[i].VideoURL) {
            if (data[i].VideoURL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = data[i].VideoURL;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + data[i].VideoURL;
            }
          } else if (data[i].URL) {
            if (data[i].URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = data[i].URL;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + data[i].URL;
            }

          }

          responseData.push({
            lessionId: `${data[i]._id}`,
            title: `${data[i].Title}`,
            description: `${data[i].Description}`,
            videoURL: `${youtubeUrl}`,
            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
            duration: `${data[i].Duration}`,
            popupDescription: `${data[i].Popup_description}`,
            popupColour: `${data[i].Popup_colour}`
          })
        }
        const finalResponse = await objectWrapper.objectWrapper(responseData);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('FreeVideo::Error in getAllVideos', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = FreeVideo;
