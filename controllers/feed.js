/**
 * @name feed.js
 *
 * @summary Provides API for Feeds
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

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE } = require('../utils/constants');

// const {readingFile, authorize, getNewToken, storeToken, getChannel} = require('../quickstart');
/**
 * @class Feed
 *
 * @summary Feed Class for managing API for feed component for user app
 *
 */

class Feed extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get all feeds video
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all feeds
   */

  getFeeds = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        feedId = queryParam ? queryParam.feedId : undefined,
        feedQuery = feedId ? { _id: ObjectId(feedId) } : {};

      const gameType = queryParam ? queryParam.gameType : undefined,
        gameTypeQuery = gameType ? { GameType: gameType } : {};

      const audience = queryParam ? queryParam.audience : undefined,
        audienceQuery = audience ? { Audience: audience } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.FEEDS)
          .find({
            ...feedQuery,
            ...gameTypeQuery,
            ...audienceQuery,
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
        // let responseData = [];

        for (let i = 0; i < data.length; i++) {
          const thumbnailId = data[i].VideoThumbnail;

          const thumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(thumbnailId) })
            .toArray();

          let youtubeUrl = null;
          if (data[i].YoutubeUrl && data[i].YoutubeUrl.length) {
            if (data[i].YoutubeUrl.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = data[i].YoutubeUrl;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + data[i].YoutubeUrl;
            }
          }

          responseData.push({
            feedId: `${data[i]._id}`,
            title: `${data[i].FeedTitle}`,
            tags: data[i].Tags,
            description: `${data[i].Description}`,
            audience: `${data[i].Audience}`,
            gameType: `${data[i].GameType}`,
            youtubeURL: `${youtubeUrl}`,
            duration: `${data[i].Duration}`,
            order: data[i].order,
            thumbnail: `${thumbnailData[0] && thumbnailData[0].url}`,
          });
        }
        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'video_uploads', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }

      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('Feeds::Error in getFeeds', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = Feed;
