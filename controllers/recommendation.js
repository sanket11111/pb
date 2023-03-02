/**
 * @name recommendation.js
 *
 * @summary Provides API for recommendation
 *
 * @author Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
    axios = require('axios'),
    BaseController = require('./base-controller'),
    objectWrapper = require('../utils/objectWrapper'),
    BLANK_SPACE = ' ',
    getSecretFun = require('../utils/secret-manager'),
    Feed = require('./feed'),
    Log = require('../utils/logger').getLogger();

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, STATUS_TYPE, COMPONENTS, TYPES } = require('../utils/constants');

/**
 * @class Recommendation
 *
 * @summary Recommendation Class for managing API for recommendation component for user app
 *
 */

class Recommendation extends BaseController {
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
   * function to get recommended videos
   *
   * @param {*}
   *        event: event triggers that cause the invocation of the lambda
   *        conn: MongoDB connection object
   *
   * @returns a list of all recommended videos
   */

    getRecommendation = async (event, conn) => {
        this.connection = this.connection || conn;
        try {
            const userId = await this.getUserId(event),
                // "10456",
                lastSeenVideo = await this.connection.collection(COLLECTIONS.USER).aggregate([
                    { $match: { userId, componentType: 'video', courseId: { $ne: '0' } } },
                    { $sort: { date: -1 } },
                    { $limit: 1 },
                ]).toArray();

            if (lastSeenVideo && lastSeenVideo.length) {
                if (lastSeenVideo[0].progressData.status === 'Incomplete') {
                    const finalResponse = await objectWrapper.objectWrapper(lastSeenVideo[0]);
                    return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
                } else {
                    const chapterData = await this.connection
                        .collection(COLLECTIONS.CHAPTER)
                        .find({ course: lastSeenVideo[0].courseId, ...{ published_at: { $ne: null } } })
                        .sort({ order: 1 })
                        .toArray();

                    const videoResponse = [];
                    for (let j = 0; j < chapterData.length; j++) {
                        const videosArray = chapterData[j].Videos || [],
                            videosRef = videosArray.map((ele) => ele.ref);

                        for (let k = 0; k < videosRef.length; k++) {
                            let isVideoCompleted = await this.connection
                                .collection(COLLECTIONS.USER)
                                .find({ userId, "progressData.status": "completed", "courseId": lastSeenVideo[0].courseId, "chapterId": chapterData[j]._id, "componentId": `${videosRef[k]}` })
                                .toArray();

                            if (isVideoCompleted && isVideoCompleted.length) {
                                videosRef.splice(k, 1);
                                k--;
                            }
                        }

                        const componentDevVideos = await this.connection
                            .collection(COMPONENTS.VIDEO)
                            .find({ _id: { $in: videosRef } })
                            .sort({ order: 1 })
                            .toArray();

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
                    }
                    if (videoResponse && videoResponse.length) {
                        const finalResponse = await objectWrapper.objectWrapper(videoResponse);
                        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
                    } else {
                        const feedsData = await new Feed().getFeeds({}, this.connection),
                            feeds = JSON.parse(feedsData.body),
                            finalResponse = await objectWrapper.objectWrapper(feeds.data);
                        return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
                    }
                }
            } else {
                const feedsData = await new Feed().getFeeds({}, this.connection),
                    feeds = JSON.parse(feedsData.body),
                    finalResponse = await objectWrapper.objectWrapper(feeds.data);
                return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
            }
        } catch(err) {
            Log.error('Recommendation::Error in getRecommendation', err);
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
        }
    }
}

module.exports = Recommendation;