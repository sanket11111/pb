/**
 * @name liveStream.js
 *
 * @summary Provides API for Live Stream Data/Config
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
 * @class LiveStream
 *
 * @summary LiveStream Class for managing API for livestream component for user app
 *
 */
class LiveStream extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get all free live
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all free live
   */

  getLiveStream = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        streamId = queryParam ? queryParam.streamId : undefined,
        idquery = streamId ? { _id: ObjectId(streamId) } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.LIVESTREAM)
          .find({ ...idquery, ...{ published_at: { $ne: null } } })
          .sort({ Scheduled_Date_Time: 1 })
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
          const tagsArray = data[i].Tag || [],
            tagsRef = tagsArray.map((ele) => ele.ref),
            componentDevTags = await this.connection
            .collection(COMPONENTS.Tag)
            .find({ _id: { $in: tagsRef } })
            .toArray();

          const tags = componentDevTags.map((ele) => ele.tag),
            thumbnailId = data[i].Thumbnail;

          const thumbnailData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(thumbnailId) })
            .toArray();

          let youtubeUrl = null;
          if (data[i].Youtube_URL && data[i].Youtube_URL.length) {
            if (data[i].Youtube_URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
              youtubeUrl = data[i].Youtube_URL;
            } else {
              youtubeUrl = `https://www.youtube.com/watch?v=` + data[i].Youtube_URL;
            }
          }

          responseData.push({
            streamId: `${data[i]._id}`,
            title: `${data[i].Title}`,
            tags,
            description: `${data[i].Description}`,
            youtubeURL: `${youtubeUrl}`,
            dateTime: `${data[i].Scheduled_Date_Time}`,
            thumbnail: `${thumbnailData[0] && thumbnailData[0].url}`,
            isActive: data[i].IsActive,
          });
        }
        if (queryParam && queryParam.tag) {
          responseData = responseData.filter((ele) => (ele.tags).includes(queryParam.tag))
        }
        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'live_streams', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('LiveStream::Error in getLiveStream', err);
      return generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = LiveStream;
