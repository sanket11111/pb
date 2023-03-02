/**
 * @name banner.js
 *
 * @summary Provides API for Banner Configuration
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
  BaseController = require('./base-controller'),
  objectWrapperWithHeader = require('../utils/objectWrapperWithHeader'),
  Log = require('../utils/logger').getLogger();

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE } = require('../utils/constants');

/**
 * @class Banner
 *
 * @summary Banner Class for managing API for banner component for user app
 *
 */
class Banner extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get all banners
   * @param {*}
   *      event: event triggers that cause the invocation of the lambda
   *      conn: MongoDB connection object
   *
   * @returns a list of all banners
   */
  getBanners = async (event, conn) => {
    try {
      const queryParam = event.queryStringParameters,
        bannerId = queryParam ? queryParam.bannerId : undefined,
        bannerQuery = bannerId ? { _id: ObjectId(bannerId) } : {};

      const bannerType = queryParam ? queryParam.bannerType : undefined,
        bannerTypeQuery = bannerType ? { BannerType: bannerType } : {};

      const category = queryParam ? queryParam.category : undefined,
        categoryQuery = category ? { BannerCategory: category } : {};

      this.connection = this.connection || conn;

      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.BANNER)
          .find({
            ...bannerQuery,
            ...bannerTypeQuery,
            ...categoryQuery,
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
          const bannerImageId = data[i].BannerImage;

          const bannerImageData = await this.connection
            .collection(COLLECTIONS.UPLOADFILE)
            .find({ _id: ObjectId(bannerImageId) })
            .toArray();

          responseData.push({
            bannerId: `${data[i]._id}`,
            name: `${data[i].BannerName}`,
            category: data[i].BannerCategory,
            type: `${data[i].BannerType}`,
            screen: `${data[i].SelectScreen}`,
            startTime: `${data[i].Start_DateTime}`,
            endTime: `${data[i].End_DateTime}`,
            buttonText: `${data[i].ButtonText}`,
            order: data[i].order,
            image: `${bannerImageData[0] && bannerImageData[0].url}`,
          });
        }

        const a = await new objectWrapperWithHeader();
        const finalResponse = await a.wrapperWithHeader(responseData, 'banners', this.connection);
        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
      }
      responseData = { status: "success", count: 0, data: [] };
      return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
    } catch (err) {
      Log.error('Banner::Error in getBanners', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = Banner;
