import { Injectable, Logger } from "@nestjs/common";
import { SettingRepository } from "../database";
import { RedisClient } from "./redisClient.service";



@Injectable()
export class RedisCaching {

    constructor(private readonly settingRepository: SettingRepository, private readonly redist: RedisClient) { }

    private getKey(keys) {
        let key = ''
        if (keys.length > 0) {
            for (let i = 0; i < keys.length; i++) {
                if (key == '') {
                    key = key + keys[i]
                } else {
                    key = key + ',key=' + keys[i]
                }
            }
        }
        return key
    }

    // Hands a cached value to a caller's callback. These callbacks used to run inside the
    // Redis client's own callbacks, where a throw is an uncaught exception that restarts the
    // service; the callback's result or error now settles the promise the caller awaits.
    private settle(callback: Function, value: any, resolve: (v: any) => void, reject: (e: any) => void) {
        try {
            Promise.resolve(callback(value)).then(resolve, reject);
        } catch (error) {
            reject(error);
        }
    }

    async globalSet(key, value, callback?) {
        this.redist.set(key, JSON.stringify(value), function () {
            callback && callback()
        })
    }

    async globalSetex(key, value, expireTime, callback?) {
        this.redist.setex(key, JSON.stringify(value), expireTime, function () {
            callback && callback()
        })
    }

    async globalGet(key, callback) {
        return new Promise((resolve, reject) => {
            this.redist.get(key, (err, result) => {
                this.settle(callback, err ? null : result ? JSON.parse(result) : undefined, resolve, reject)
            })
        })
    }

    async globalGetAsync(key, json = true) {
        let self = this;
        console.log("In redis server globalGetAsync")
        let returnVal;
        await new Promise((resolve, reject) => {
            self.redist.get(key, function (err, result) {
                console.log("result:", result);
                if (err) {
                    reject(err)
                }
                if (result) {
                    returnVal = json ? JSON.parse(result) : result;
                    console.log("inside returnVal", returnVal)
                    resolve(json ? JSON.parse(result) : result)
                } else {
                    return resolve(null);
                }
            })
        })
        console.log("returnVal", returnVal);
        return returnVal;
    }

    async globalDelAsync(key) {
        return new Promise((resolve, reject) => {
            this.redist.del(key, function (err, count) {
                if (err) {
                    return reject(err)
                }
                resolve(count)
            })
        })
    }

    async getAndSetOne(req, params, value, callback) {
        let expireTime = (60 * 60) * 12

        let firstParams = req.instancekey
        if (req.params) {
            if (req.params.id) {
                firstParams = firstParams + req.params.id

            }
        }
        let key = this.getKey([firstParams, params])
        return this.getOrSet(key.toString(), value, expireTime, callback)
    }

    async getAdaptiveQuestion(req, params, value, callback) {
        let expireTime = 60 * 60;
        let key = req.instancekey + req.user._id + params
        return this.getOrSet(key.toString(), value, expireTime, callback)
    }

    // Passes the cached value to callback; when nothing is cached, caches `value` and passes that.
    private getOrSet(key: string, value, expireTime: number, callback) {
        return new Promise((resolve, reject) => {
            this.redist.get(key, (err, result) => {
                if (err) {
                    this.settle(callback, null, resolve, reject)
                } else if (result) {
                    this.settle(callback, JSON.parse(result), resolve, reject)
                } else if (value != null) {
                    this.redist.setex(key, JSON.stringify(value), expireTime, () => {
                        this.settle(callback, value, resolve, reject)
                    })
                } else {
                    this.settle(callback, value, resolve, reject)
                }
            })
        })
    }

    async get(req, params, callback) {
        let key = this.getKey([req.instancekey, params])
        return new Promise((resolve, reject) => {
            this.redist.get(key.toString(), (err, result) => {
                this.settle(callback, err ? null : result ? JSON.parse(result) : undefined, resolve, reject)
            })
        })
    }

    async set(req, params, value, expireTime?, callback?) {
        let key = this.getKey([req.instancekey, params])
        if (expireTime) {
            // Set expiration time
            this.redist.setex(key.toString(), JSON.stringify(value), expireTime, function (err, reply) {
                if (err) {
                    Logger.error('fail to set redis ' + err)
                }
                console.log("Redis Set: ", reply)
                callback && callback()
            })
        } else {
            this.redist.set(key.toString(), JSON.stringify(value), function (err, reply) {
                if (err) {
                    Logger.error('fail to set redis ' + err)
                }
                console.log("Redis Set: ", reply)
                callback && callback()
            })
        }
    }

    async getAsync(ik, params) {
        return new Promise((resolve, reject) => {
            let key = this.getKey([ik, params])
            this.redist.get(key.toString(), function (err, result) {
                if (result) {
                    console.log("in result")
                    resolve(JSON.parse(result))
                } else {
                    console.log("in error")
                    resolve(null)
                }
            })
        })
    }

    async getSettingAsync(ik) {
        return new Promise((resolve, reject) => {
            let expireTime = (60 * 60) * 24
            let key = this.getKey([ik, 'whiteLabel'])
            this.redist.get(key.toString(), async (err, result) => {
                try {
                    if (!err && result) {
                        // Cached: no need to read the database again
                        return resolve(JSON.parse(result))
                    }

                    const doc = await this.settingRepository.findOne({ 'slug': 'whiteLabel' })
                    if (!doc) {
                        return reject(new Error('whiteLabel setting not found'))
                    }
                    this.redist.setex(key.toString(), JSON.stringify(doc), expireTime, function () {
                        resolve(doc)
                    })
                } catch (error) {
                    reject(error)
                }
            })
        })
    }

    async getSetting(req, callback?) {

        if (callback) {
            let expireTime = (60 * 60) * 24;
            let key = this.getKey([req.instancekey, 'whiteLabel']);

            return new Promise((resolve, reject) => {
                this.redist.get(key.toString(), async (err, result) => {
                    try {
                        if (!err && result) {
                            return this.settle(callback, JSON.parse(result), resolve, reject);
                        }
                        const found = await this.settingRepository.findOne({ 'slug': 'whiteLabel' });
                        if (!found) {
                            return this.settle(callback, null, resolve, reject);
                        }
                        this.redist.setex(key.toString(), JSON.stringify(found), expireTime, (err) => {
                            if (err) {
                                Logger.error('fail to set redis ' + err);
                            }
                            this.settle(callback, found, resolve, reject);
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        } else {
            let expireTime = (60 * 60) * 24;
            let key = this.getKey([req.instancekey, 'whiteLabel']);
            const self = this;

            try {
                let result: string = await new Promise((resolve, reject) => {
                    this.redist.get(key.toString(), (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
                })

                if (result) {
                    console.log("CACHED");
                    return JSON.parse(result);
                }

                console.log("NOT CACHED");

                this.settingRepository.setInstanceKey(req.instancekey)
                const found = await self.settingRepository.findOne({ 'slug': 'whiteLabel' });

                if (!found) {
                    return null;
                }

                await new Promise((resolve, reject) => {
                    self.redist.setex(key.toString(), JSON.stringify(found), expireTime, (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                });

                return found;
            } catch (error) {
                console.log(error);
                throw error;
            }
        }
    }


    async del(req, cacheKey, callback?) {
        let firstParams = req.instancekey
        if (req.params && req.params.id) {
            firstParams = firstParams + req.params.id
        }
        let key = this.getKey([firstParams, cacheKey])
        return new Promise((resolve, reject) => {
            this.redist.get(key, (err) => {
                if (err) {
                    return callback ? this.settle(callback, null, resolve, reject) : resolve(null)
                }
                this.redist.del(key, (err, count) => {
                    callback ? this.settle(callback, count, resolve, reject) : resolve(count)
                })
            })
        })
    }
}
