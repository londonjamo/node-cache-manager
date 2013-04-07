var assert = require('assert');
var Lru = require("lru-cache")
var support = require('./support');
var check_err = support.check_err;
var caching = require('../index').caching;
var multi_caching = require('../index').multi_caching;
var memory_store = require('../lib/stores/memory');

function get_widget(name, cb) {
    cb(null, {name: name});
}

describe("multi_caching", function() {
    var redis_cache;
    var memory_cache;
    var memory_cache2;
    var multi_cache;
    var key;
    var memory_ttl;
    var redis_ttl;
    var name;

    beforeEach(function() {
        memory_ttl = 0.1;
        redis_ttl = 1;

        memory_cache = caching({store: 'memory', ttl: memory_ttl});
        memory_cache2 = caching({store: 'memory', ttl: memory_ttl});
        redis_cache = caching({store: 'redis', ttl: redis_ttl});

        key = support.random.string(20);
        name = support.random.string();
    });

    describe("get(), set(), del()", function() {
        var value;

        beforeEach(function() {
            multi_cache = multi_caching([memory_cache, redis_cache, memory_cache2]);
            key = support.random.string(20);
            value = support.random.string();
        });

        describe("set()", function() {
            it("lets us set data in all caches", function(done) {
                multi_cache.set(key, value, function(err, result) {
                    check_err(err);
                    memory_cache.get(key, function(err, result) {
                        assert.equal(result, value);

                        redis_cache.get(key, function(err, result) {
                            check_err(err);
                            assert.equal(result, value);

                            memory_cache2.get(key, function(err, result) {
                                check_err(err);
                                assert.equal(result, value);
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe("get()", function() {
            it("gets data from first cache that has it", function(done) {
                redis_cache.set(key, value, function(err) {
                    check_err(err);

                    multi_cache.get(key, function(err, result) {
                        check_err(err);
                        assert.equal(result, value);
                        done();
                    });
                });
            });
        });

        describe("del()", function() {
            it("lets us delete data in all caches", function(done) {
                multi_cache.set(key, value, function(err, result) {
                    check_err(err);

                    multi_cache.del(key, function(err, result) {
                        check_err(err);

                        memory_cache.get(key, function(err, result) {
                            assert.ok(!result);

                            redis_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.ok(!result);

                                memory_cache2.get(key, function(err, result) {
                                    check_err(err);
                                    assert.ok(!result);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("wrap()", function() {
        describe("using a single cache store", function() {
            beforeEach(function() {
                multi_cache = multi_caching([redis_cache]);
            });

            it("calls back with the result of a function", function(done) {
                multi_cache.wrap(key, function(cb) {
                    get_widget(name, cb);
                }, function(err, widget) {
                    check_err(err);
                    assert.deepEqual(widget, {name: name});
                    done();
                });
            });
        });

        describe("using two cache stores", function() {
            beforeEach(function() {
                multi_cache = multi_caching([memory_cache, redis_cache]);
            });

            it("calls back with the result of a function", function(done) {
                multi_cache.wrap(key, function(cb) {
                    get_widget(name, cb);
                }, function(err, widget) {
                    check_err(err);
                    assert.deepEqual(widget, {name: name});
                    done();
                });
            });

            it("sets value in all caches", function(done) {
                multi_cache.wrap(key, function(cb) {
                    get_widget(name, cb);
                }, function(err, widget) {
                    check_err(err);
                    assert.deepEqual(widget, {name: name});

                    memory_cache.get(key, function(err, result) {
                        check_err(err);
                        assert.deepEqual(result, {name: name});

                        redis_cache.get(key, function(err, result) {
                            check_err(err);
                            assert.deepEqual(result, {name: name});
                            done();
                        });
                    });
                });
            });

            context("when value exists in first store but not second", function() {
                it("returns value from first store, does not set it in second", function(done) {
                    memory_cache.set(key, {name: name}, function(err) {
                        multi_cache.wrap(key, function(cb) {
                            get_widget(name, cb);
                        }, function(err, widget) {
                            check_err(err);
                            assert.deepEqual(widget, {name: name});

                            redis_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.equal(result, null);
                                done();
                            });
                        });
                    });
                });
            });

            context("when value exists in second store but not first", function() {
                it("returns value from second store, sets it in first store", function(done) {
                    redis_cache.set(key, {name: name}, function(err) {
                        multi_cache.wrap(key, function(cb) {
                            get_widget(name, cb);
                        }, function(err, widget) {
                            check_err(err);
                            assert.deepEqual(widget, {name: name});

                            memory_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.deepEqual(result, {name: name});
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe("using three cache stores", function() {
            beforeEach(function() {
                multi_cache = multi_caching([memory_cache, redis_cache, memory_cache2]);
            });

            it("calls back with the result of a function", function(done) {
                multi_cache.wrap(key, function(cb) {
                    get_widget(name, cb);
                }, function(err, widget) {
                    check_err(err);
                    assert.deepEqual(widget, {name: name});
                    done();
                });
            });

            it("sets value in all caches", function(done) {
                multi_cache.wrap(key, function(cb) {
                    get_widget(name, cb);
                }, function(err, widget) {
                    check_err(err);
                    assert.deepEqual(widget, {name: name});

                    memory_cache.get(key, function(err, result) {
                        check_err(err);
                        assert.deepEqual(result, {name: name});

                        redis_cache.get(key, function(err, result) {
                            check_err(err);
                            assert.deepEqual(result, {name: name});

                            memory_cache2.get(key, function(err, result) {
                                check_err(err);
                                assert.deepEqual(result, {name: name});
                                done();
                            });
                        });
                    });
                });
            });

            context("when value exists in first store only", function() {
                it("returns value from first store, does not set it in second or third", function(done) {
                    memory_cache.set(key, {name: name}, function(err) {
                        multi_cache.wrap(key, function(cb) {
                            get_widget(name, cb);
                        }, function(err, widget) {
                            check_err(err);
                            assert.deepEqual(widget, {name: name});

                            redis_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.equal(result, null);

                                memory_cache2.get(key, function(err, result) {
                                    check_err(err);
                                    assert.equal(result, null);
                                    done();
                                });
                            });
                        });
                    });
                });
            });

            context("when value exists in second store only", function() {
                it("returns value from second store, sets it in first store, does not set third store", function(done) {
                    redis_cache.set(key, {name: name}, function(err) {
                        multi_cache.wrap(key, function(cb) {
                            get_widget(name, cb);
                        }, function(err, widget) {
                            check_err(err);
                            assert.deepEqual(widget, {name: name});

                            memory_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.deepEqual(result, {name: name});

                                memory_cache2.get(key, function(err, result) {
                                    check_err(err);
                                    assert.equal(result, null);
                                    done();
                                });
                            });
                        });
                    });
                });
            });

            context("when value exists in third store only", function() {
                it("returns value from third store, sets it in first and second stores", function(done) {
                    memory_cache2.set(key, {name: name}, function(err) {
                        multi_cache.wrap(key, function(cb) {
                            get_widget(name, cb);
                        }, function(err, widget) {
                            check_err(err);
                            assert.deepEqual(widget, {name: name});

                            redis_cache.get(key, function(err, result) {
                                check_err(err);
                                assert.deepEqual(result, {name: name});

                                memory_cache.get(key, function(err, result) {
                                    check_err(err);
                                    assert.deepEqual(result, {name: name});

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});