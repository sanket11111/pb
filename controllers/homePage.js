/**
 * @name homePage.js
 *
 * @summary Provides API for Home Page Layout
 *
 * @author Nikhil Aggarwal, Srishti Agarwal, Bhavana Agrawal, Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
  BaseController = require('./base-controller'),
  FreeQuiz = require('./freeQuiz'),
  LiveStream = require('./liveStream'),
  Course = require('./course'),
  FreeVideo = require('./freeVideo'),
  Feed = require('./feed'),
  Banner = require('./banner'),
  objectWrapper = require('../utils/objectWrapper'),
  objectWrapperWithHeader = require('../utils/objectWrapperWithHeader'),
  Log = require('../utils/logger').getLogger();

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, CHOOSE_COMPONENTS } = require('../utils/constants');

/**
 * @class HomePage
 *
 * @summary HomePage Class for managing API for homepage component for user app
 *
 */

class HomePage extends BaseController {
  constructor() {
    super(true);
  }

  /**
   * function to get homepage
   *
   * @param {*} event: event triggers that cause the invocation of the lambda
   *
   * @returns the whole homepage
   */

  operations = async (event, conn) => {
    try {
      this.connection = this.connection || conn;
      let data;
      try {
        data = await this.connection
          .collection(COLLECTIONS.HOMEPAGE)
          .find({ ...{ published_at: { $ne: null } } })
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
          const addComponentArray = data[i].AddComponents || [],
            addComponentRef = addComponentArray.map((ele) => ele.ref);

          const componentDevAddComponentData = [];

          for (let j = 0; j < addComponentRef.length; j++) {
            const componentDevAddComponent = await this.connection
              .collection(COMPONENTS.ADDCOMPONENT)
              .find({ _id: ObjectId(addComponentRef[j]) })
              .toArray();

            componentDevAddComponentData.push(componentDevAddComponent[0]);
          }

          for (let j = 0; j < componentDevAddComponentData.length; j++) {
            const chooseComponents = componentDevAddComponentData[j].ChooseYourComponents;

            if (chooseComponents == CHOOSE_COMPONENTS.FREEQUIZ) {
              const freeQuiz = await new FreeQuiz().getAllFreeQuiz({}, this.connection);

              responseData.push({ quiz: JSON.parse(freeQuiz.body) });
            } else if (chooseComponents == CHOOSE_COMPONENTS.FEED_LIVESTREAM) {
              const liveStream = await new LiveStream().getLiveStream({}, this.connection),
                parseLiveStreamData = JSON.parse(liveStream.body).data || [];

              let activeData = [];
              if (parseLiveStreamData.length != 0) {
                for (let n = 0; n < parseLiveStreamData.length; n++) {
                  if (parseLiveStreamData[n].isActive == true) {
                    activeData.push(parseLiveStreamData[n]);
                  }
                }
              }
              if (activeData && activeData.length) {
                const a = await new objectWrapperWithHeader();
                const finalResponse = await a.wrapperWithHeader(activeData, 'live_streams', this.connection);

                responseData.push({ LiveStream: finalResponse });
              } else {
                const feeds = await new Feed().getFeeds({}, this.connection);

                responseData.push({ Feeds: JSON.parse(feeds.body) });
              }
            } else if (chooseComponents == CHOOSE_COMPONENTS.COURSES) {
              const course = await new Course().getAllCourse({}, this.connection);

              responseData.push({ courses: JSON.parse(course.body) });
            } else if (chooseComponents == CHOOSE_COMPONENTS.FREELESSONS) {
              const freeVideo = await new FreeVideo().getAllFreeVideo({}, this.connection);

              responseData.push({ FreeLesson: JSON.parse(freeVideo.body) });
            } else {
              const banner = await new Banner().getBanners({}, this.connection);

              responseData.push({ Banner: JSON.parse(banner.body) });
            }
          }

          const finalResponse = await objectWrapper.objectWrapper(responseData);
          return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
        }
      } else {
        responseData = { status: "success",count: 0, data: [] };
        return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
      }
    } catch (err) {
      Log.error('HomePage::Error in operations', err);
      return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
    }
  };
}

module.exports = HomePage;
