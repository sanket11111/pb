/**
 * @name bookmark.js
 *
 * @summary Provides API for Bookmark
 *
 * @author Rohit Ranjan
 *
 * VectoScalar Technologies Pvt Ltd
 */

'use strict';

const { ObjectId } = require('mongodb'),
    BaseController = require('./base-controller'),
    objectWrapper = require('../utils/objectWrapper'),
    Log = require('../utils/logger').getLogger(),
    BLANK_SPACE = ' ',
    getSecretFun = require('../utils/secret-manager'),
    axios = require('axios');

const { STATUS_CODES, STATUS_MESSAGES, COLLECTIONS, COMPONENTS, STATUS_TYPE, TYPES } = require('../utils/constants');

/**
 * @class Bookmark
 *
 * @summary Bookmark Class for managing API for bookmark component for user app
 *
 */
class Bookmark extends BaseController {
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
     * function to post and delete bookmark
     * @param {*}
     *      event: event triggers that cause the invocation of the lambda
     *      conn: MongoDB connection object
     *
     * @returns status code with created record
     */

    postAndDeleteBookmark = async (event, conn) => {
        if (!event.body) {
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.DATA_NOT_AVAILABLE, STATUS_MESSAGES.NORECORD);
        }

        const bookmarkData = JSON.parse(event.body);

        try {
            this.connection = this.connection || conn;
            // let userId = await this.getUserId(event);
            let userId = '10456';

            const isBookmarked = await this.connection.collection(COLLECTIONS.BOOKMARK).count({
                userId,
                typeId: bookmarkData.typeId,
            });
            if (isBookmarked) {
                await this.connection.collection(COLLECTIONS.BOOKMARK).deleteOne({
                    userId,
                    typeId: bookmarkData.typeId,
                });
                return this.generateResponse(STATUS_CODES.SUCCESS, STATUS_MESSAGES.DELETED);
            }
            const bookmark = await this.connection.collection(COLLECTIONS.BOOKMARK).insertOne({
                userId,
                type: bookmarkData.type,
                typeId: bookmarkData.typeId,
                createdAt: Date.now(),
            });
            return this.generateResponse(STATUS_CODES.SUCCESS, STATUS_MESSAGES.CREATED);

        } catch (err) {
            Log.error('Bookmark::Error in postAndDeleteBookmark', err);
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, err);
        }
    };

    /**
    * function to get a list of videos bookmark
    * @param {*}
    *      event: event triggers that cause the invocation of the lambda
    *      conn: MongoDB connection object
    *
    * @returns array of objects
    */
    getVideosBookmark = async (event, conn) => {
        try {
            this.connection = this.connection || conn;
            let userId = await this.getUserId(event);

            let data;
            try {
                data = await this.connection
                    .collection(COLLECTIONS.BOOKMARK)
                    .find({
                        type: 'video', userId
                    })
                    .sort({ createdAt: -1 })
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
                const videoIds = data.map((ele) => ele.typeId);

                for (let i = 0; i < videoIds.length; i++) {
                    let videos = await this.connection
                        .collection(COLLECTIONS.FREEVIDEO)
                        .find({
                            _id: ObjectId(videoIds[i])
                        })
                        .toArray();

                    if (!videos || !videos.length) {
                        videos = await this.connection
                            .collection(COMPONENTS.VIDEO)
                            .find({
                                _id: ObjectId(videoIds[i])
                            })
                            .toArray();
                    }

                    if (videos && videos.length) {
                        const thumbnailId = videos[0].VideoThumbnail || (videos[0].Thumbnail)[0];
                        const uploadThumbnailData = await this.connection
                            .collection(COLLECTIONS.UPLOADFILE)
                            .find({ _id: ObjectId(thumbnailId) })
                            .toArray();

                        let youtubeUrl = null;
                        if (videos[0].VideoURL) {
                            if (videos[0].VideoURL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                                youtubeUrl = videos[0].VideoURL;
                            } else {
                                youtubeUrl = `https://www.youtube.com/watch?v=` + videos[0].VideoURL;
                            }
                        } else if (videos[0].URL) {
                            if (videos[0].URL.match(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?[\w\?‌​=]*)?/)) {
                                youtubeUrl = videos[0].URL;
                            } else {
                                youtubeUrl = `https://www.youtube.com/watch?v=` + videos[0].URL;
                            }

                        }
                        responseData.push({
                            lessionId: `${videos[0]._id}`,
                            title: `${videos[0].Title}`,
                            description: `${videos[0].description}`,
                            videoURL: `${youtubeUrl}`,
                            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
                            duration: `${videos[0].Duration}`,
                        })
                    }
                };
                const finalResponse = await objectWrapper.objectWrapper(responseData);
                return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
            }

            responseData = { status: "success", count: 0, data: [] };
            return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
        } catch (err) {
            Log.error('Feeds::Error in getVideosBookmark', err);
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
        }
    };

    /**
   * function to get a list of chapters bookmark
   * @param {*}
   *      event: event triggers that cause the invocation of the lambda
   *      conn: MongoDB connection object
   *
   * @returns array of objects
   */
    getChaptersBookmark = async (event, conn) => {
        try {
            this.connection = this.connection || conn;
            let userId = await this.getUserId(event);

            let data;
            try {
                data = await this.connection
                    .collection(COLLECTIONS.BOOKMARK)
                    .find({
                        type: 'chapter', userId
                    })
                    .sort({ createdAt: -1 })
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
                const chapterIds = data.map((ele) => ele.typeId);

                for (let i = 0; i < chapterIds.length; i++) {
                    const chapters = await this.connection
                        .collection(COLLECTIONS.CHAPTER)
                        .find({
                            _id: ObjectId(chapterIds[i])
                        })
                        .toArray();

                    if (chapters && chapters.length) {
                        const uploadThumbnailData = await this.connection
                            .collection(COLLECTIONS.UPLOADFILE)
                            .find({ _id: chapters[0].ChapterThumbnail })
                            .toArray();

                        responseData.push({
                            chapterId: `${chapters[0]._id}`,
                            title: `${chapters[0].Title}`,
                            description: `${chapters[0].Description}`,
                            thumbnail: `${uploadThumbnailData[0] && uploadThumbnailData[0].url}`,
                            gameType: `${chapters[0].GameType}`,
                            audience: `${chapters[0].Audience}`,
                        })
                    }
                };
                const finalResponse = await objectWrapper.objectWrapper(responseData);
                return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
            }

            responseData = { status: "success", count: 0, data: [] };
            return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
        } catch (err) {
            Log.error('Feeds::Error in getChaptersBookmark', err);
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
        }
    };

    /**
    * function to get a list of quiz bookmark
    * @param {*}
    *      event: event triggers that cause the invocation of the lambda
    *      conn: MongoDB connection object
    *
    * @returns array of objects
    */
    getQuizBookmark = async (event, conn) => {
        try {
            this.connection = this.connection || conn;
            // let userId = await this.getUserId(event);
            let userId = '10456';

            let data;
            try {
                data = await this.connection
                    .collection(COLLECTIONS.BOOKMARK)
                    .find({
                        type: 'quiz', userId
                    })
                    .sort({ createdAt: -1 })
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
                const quizIds = data.map((ele) => ele.typeId);

                for (let i = 0; i < quizIds.length; i++) {
                    let quiz = await this.connection
                        .collection(COLLECTIONS.QUIZ)
                        .find({
                            _id: ObjectId(quizIds[i])
                        })
                        .toArray();

                    if (!quiz || !quiz.length) {
                        quiz = await this.connection
                            .collection(COMPONENTS.QUIZ)
                            .find({
                                _id: ObjectId(quizIds[i])
                            })
                            .toArray();
                    }

                    if (quiz && quiz.length) {
                        const questionCount = quiz[0].MCQs ? quiz[0].MCQs.length : quiz[0].AddMCQs.length;
                        responseData.push({
                            quizId: `${quiz[0]._id}`,
                            title: `${quiz[0].QuizTitle}`,
                            questionCount: questionCount
                        })
                        for (let j = 0; j < responseData.length; j++) {
                            const obj = responseData[j].questionCount;
                            if (obj === 0) {
                                responseData.splice(j, 1);
                                j--;
                            }
                        }
                    }
                };
                const finalResponse = await objectWrapper.objectWrapper(responseData);
                return this.generateResponse(STATUS_CODES.SUCCESS, finalResponse);
            }

            responseData = { status: "success", count: 0, data: [] };
            return this.generateResponse(STATUS_CODES.SUCCESS, responseData);
        } catch (err) {
            Log.error('Feeds::Error in getQuizBookmark', err);
            return this.generateResponseForError(STATUS_TYPE.FAIL, STATUS_CODES.BAD_REQUEST, STATUS_MESSAGES.BAD_REQUEST);
        }
    };
}

module.exports = Bookmark;
