/**
 * @name popup.js
 *
 * @summary Provides API for Popup
 *
 * @author Rohit Ranjan
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
  * @class Popup
  *
  * @summary Popup Class for managing API for popup component for user app
  *
  */
 class Popup extends BaseController {
   constructor() {
     super(true);
   }
 
   /**
    * function to get the popup for a day
    * @param {*}
    *      event: event triggers that cause the invocation of the lambda
    *      conn: MongoDB connection object
    *
    * @returns an object of a popup
    */
   getPopup = async (event, conn) => {
     try {
       const queryParam = event.queryStringParameters,
         day = queryParam ? queryParam.day : undefined,
         dayQuery = day ? { Day: day } : {};
 
       this.connection = this.connection || conn;
 
       let data;
       try {
         data = await this.connection
           .collection(COLLECTIONS.POPUP)
           .find({
            ...dayQuery,
             ...{ published_at: { $ne: null } },
           })
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
           const videoThumbnailId = data[i].VideoThumbnail,
                backgroundImageId = data[i].BackgroundImage;
                

           const videoThumbnail = await this.connection
             .collection(COLLECTIONS.UPLOADFILE)
             .find({ _id: ObjectId(videoThumbnailId[0]) })
             .toArray();

             const backgroundImage = await this.connection
             .collection(COLLECTIONS.UPLOADFILE)
             .find({ _id: ObjectId(backgroundImageId[0]) })
             .toArray();
         
           responseData.push({
             popId: `${data[i]._id}`,
             title: `${data[i].Title}`,
             videoURL: data[i].VideoURL,
             duration: `${data[i].Duration}`,
             thumbnail: `${videoThumbnail[0].url}`,
             backgroundImage: `${backgroundImage[0].url}`,
             backgroundColour: `${data[i].BackgroundColour}`,
             day: `${data[i].Day}`
           });
         }
 
         const a = await new objectWrapperWithHeader();
         const finalResponse = await a.wrapperWithHeader(responseData, 'popups', this.connection);
         return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
       }
       responseData = { status: "success", count: 0, data: [] };
       return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
     } catch (err) {
       Log.error('PopUp::Error in getPopup', err);
       return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
     }
   };
 }
 
 module.exports = Popup;
 