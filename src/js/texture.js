/*!
 * New BSD License
 *
 * Copyright (c) 2011, Morten Nobel-Joergensen, Kickstart Games ( http://www.kickstartgames.com/ )
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 * disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
 * disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var KICK = KICK || {};

KICK.namespace = KICK.namespace || function (ns_string) {
    var parts = ns_string.split("."),
        parent = KICK,
        i;
    // strip redundant leading global
    if (parts[0] === "KICK") {
        parts = parts.slice(1);
    }

    for (i = 0; i < parts.length; i += 1) {
        // create property if it doesn't exist
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }
    return parent;
};

(function () {
    "use strict"; // force strict ECMAScript 5

    var texture = KICK.namespace("KICK.texture"),
        core = KICK.namespace("KICK.core"),
        constants = core.Constants,
        vec2 = KICK.math.vec2;

    /**
     * Render texture (used for camera's render target)
     * @todo - currently incomplete
     * @class RenderTexture
     * @namespace KICK.texture
     * @constructor
     * @param {KICK.core.Engine} engine
     * @param {KICK.texture.Texture} _colorTexture Optional (may be null)
     * @param {KICK.texture.Texture} _depthTexture Optional (may be null)
     */
    texture.RenderTexture = function (engine, _colorTexture, _depthTexture){
        var gl = engine.gl,
            framebuffer = gl.createFramebuffer(),
            validTexture = _colorTexture || _depthTexture,
            _dimension = validTexture.dimension,
            renderBuffers = [];

        /**
         * @method bind
         */
        this.bind = function(){
            gl.bindFramebuffer(constants.GL_FRAMEBUFFER, framebuffer);
        };

        Object.defineProperties(this,{
            /**
             * Read only
             * @property dimension
             * @type KICK.math.vec2
             */
            dimension:{
                value:_dimension
            },
            /**
             * Read only
             * @property colorTexture
             * @type KICK.texture.Texture
             */
            colorTexture:{
                value: _colorTexture
            },
            /**
             * Read only
             * @property depthTexture
             * @type KICK.texture.Texture
             */
            depthTexture:{
                value: _depthTexture
            }
        });
            
        (function init(){
            var renderbuffer;
            gl.bindFramebuffer(constants.GL_FRAMEBUFFER, framebuffer);

            if (_colorTexture){
                gl.framebufferTexture2D(constants.GL_FRAMEBUFFER, constants.GL_COLOR_ATTACHMENT0, constants.GL_TEXTURE_2D, _colorTexture.textureId, 0);
            } else {
                renderbuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(constants.GL_RENDERBUFFER, renderbuffer);
                gl.renderbufferStorage(constants.GL_RENDERBUFFER, constants.GL_RGBA4, _dimension[0], _dimension[1]);
                gl.framebufferRenderbuffer(constants.GL_FRAMEBUFFER, constants.GL_COLOR_ATTACHMENT0, constants.GL_RENDERBUFFER, renderbuffer);
                renderBuffers.push(renderbuffer);
            }

            if (_depthTexture){
                gl.framebufferTexture2D(constants.GL_FRAMEBUFFER, constants.GL_DEPTH_ATTACHMENT, constants.GL_TEXTURE_2D, _depthTexture.textureId, 0);
            } else {
                renderbuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(constants.GL_RENDERBUFFER, renderbuffer);
                gl.renderbufferStorage(constants.GL_RENDERBUFFER, constants.GL_DEPTH_COMPONENT16, _dimension[0], _dimension[1]);
                gl.framebufferRenderbuffer(constants.GL_FRAMEBUFFER, constants.GL_DEPTH_ATTACHMENT, constants.GL_RENDERBUFFER, renderbuffer);
                renderBuffers.push(renderbuffer);
            }
            if (constants._ASSERT){
                var frameBufferStatus = gl.checkFramebufferStatus( constants.GL_FRAMEBUFFER );
                if (frameBufferStatus !== constants.GL_FRAMEBUFFER_COMPLETE){
                    switch (frameBufferStatus){
                        case constants.GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                            KICK.core.Util.fail("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                            break;
                        case constants.GL_FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                            KICK.core.Util.fail("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                            break;
                        case constants.GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                            KICK.core.Util.fail("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                            break;
                        case constants.GL_FRAMEBUFFER_UNSUPPORTED:
                            KICK.core.Util.fail("FRAMEBUFFER_UNSUPPORTED");
                            break;
                    }
                }
            }
            gl.bindFramebuffer(constants.GL_FRAMEBUFFER, null);
        })();
    };

    /**
     * Encapsulate a texture object and its configuration.
     * @class Texture
     * @namespace KICK.texture
     * @constructor
     * @param {KICK.core.Engine} engine
     * @param {Object} config Optional
     * @param {Object} uidMapping Optional Maps from old uid to new uid
     */
    texture.Texture = function (engine, config, uidMapping) {
        var gl = engine.gl,
            _uid = engine.createUID(), // note uid is always
            texture0 = constants.GL_TEXTURE0,
            thisConfig = config || {},
            _textureId = gl.createTexture(),
            _wrapS = thisConfig.wrapS ||  constants.GL_REPEAT,
            _wrapT = thisConfig.wrapT || constants.GL_REPEAT,
            _minFilter = thisConfig.minFilter || constants.GL_LINEAR,
            _magFilter = thisConfig.magFilter || constants.GL_LINEAR,
            _generateMipmaps = typeof (thisConfig.generateMipmaps) === 'boolean'? thisConfig.generateMipmaps : true,
            _autoScaleImage = typeof (thisConfig.autoScaleImage) === 'boolean'? thisConfig.autoScaleImage : true,
            _dataURI = thisConfig.dataURI || null,
            _flipY =  typeof (thisConfig.flipY )==='boolean'? thisConfig.flipY : true,
            _intformat = thisConfig.intformat || constants.GL_RGBA,
            activeTexture,
            _dimension = vec2.create(),
            isPowerOfTwo = function (x) {
                return (x & (x - 1)) == 0;
            },
            nextHighestPowerOfTwo = function (x) {
                --x;
                for (var i = 1; i < 32; i <<= 1) {
                    x = x | x >> i;
                }
                return x + 1;
            };

        if (uidMapping && thisConfig.uid){
            uidMapping[thisConfig.uid] = _uid;
        }

        (function init(){
            // create active texture component on glContext
            if (!gl.activeTexture){
                gl.activeTexture = {};
            }
            activeTexture = gl.activeTexture;
        })();

        /**
         * Bind the current texture
         * @method bind
         */
        this.bind = function(textureSlot){
            if (activeTexture[textureSlot] !== this){
                gl.activeTexture(texture0+textureSlot);
                gl.bindTexture(constants.GL_TEXTURE_2D, _textureId);
                activeTexture[textureSlot] = this;
            }
        };

        /**
         * Set texture image based on a image object
         * @method setImage
         * @param {Image} imageObj image object to import
         * @param {String} dataURI String representing the image
         */
        this.setImage = function(imageObj, dataURI){
            _dataURI = dataURI;

            if (!isPowerOfTwo(imageObj.width) || !isPowerOfTwo(imageObj.height)) {
                var width = nextHighestPowerOfTwo(imageObj.width),
                    height = nextHighestPowerOfTwo(imageObj.height);
                imageObj = core.Util.scaleImage(imageObj,width,height)
            }

            this.bind(0);
            if (_flipY){
                gl.pixelStorei(constants.GL_UNPACK_FLIP_Y_WEBGL, true);
            } else {
                gl.pixelStorei(constants.GL_UNPACK_FLIP_Y_WEBGL, false);
            }
            gl.pixelStorei(constants.GL_UNPACK_ALIGNMENT, 1);
            gl.texImage2D(constants.GL_TEXTURE_2D, 0, _intformat, _intformat, constants.GL_UNSIGNED_BYTE, imageObj);

            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_MAG_FILTER, _magFilter);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_MIN_FILTER, _minFilter);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_WRAP_S, _wrapS);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_WRAP_T, _wrapT);
            vec2.set([imageObj.width,imageObj.height],_dimension);
            if (_generateMipmaps){
                gl.generateMipmap(constants.GL_TEXTURE_2D);
            }
        };
        
        /**
         * Set a image using a raw bytearray in a specified format
         * @method setImageData
         * @param {Number} width image width in pixels
         * @param {Number} height image height in pixels
         * @param {Number} border image border in pixels
         * @param {Object} type GL_UNSIGNED_BYTE, GL_UNSIGNED_SHORT_4_4_4_4, GL_UNSIGNED_SHORT_5_5_5_1 or GL_UNSIGNED_SHORT_5_6_5
         * @param {Array} pixels array of pixels (may be null)
         * @param {String} dataURI String representing the image
         */
        this.setImageData = function(width, height, border, type, pixels, dataURI){
            if (constants._ASSERT){
                if (type !== constants.GL_UNSIGNED_BYTE &&
                    type !== constants.GL_UNSIGNED_SHORT_4_4_4_4  &&
                    type !== constants.GL_UNSIGNED_SHORT_5_5_5_1 &&
                    type !== constants.GL_UNSIGNED_SHORT_5_6_5 ){
                    KICK.core.Util.fail("Texture.setImageData (type) should be either GL_UNSIGNED_BYTE, GL_UNSIGNED_SHORT_4_4_4_4, GL_UNSIGNED_SHORT_5_5_5_1 or GL_UNSIGNED_SHORT_5_6_5");
                }
            }
            vec2.set([width,height],_dimension);
            _dataURI = dataURI;

            this.bind(0);
            gl.pixelStorei(constants.GL_UNPACK_ALIGNMENT, 1);
            gl.texImage2D(constants.GL_TEXTURE_2D, 0, _intformat, width, height, border, _intformat, type, pixels);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_MAG_FILTER, _magFilter);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_MIN_FILTER, _minFilter);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_WRAP_S, _wrapS);
            gl.texParameteri(constants.GL_TEXTURE_2D, constants.GL_TEXTURE_WRAP_T, _wrapT);
            if (_generateMipmaps){
                gl.generateMipmap(constants.GL_TEXTURE_2D);
            }
        };

        /**
         * Creates a 2x2 temporary image
         * @method setTemporaryTexture
         */
        this.setTemporaryTexture = function(){
            var blackWhiteCheckerboard = new Uint8Array([255, 255, 255,
                                             0,   0,   0,
                                             0,   0,   0,
                                             255, 255, 255]),
                oldIntFormat = _intformat;
            _intformat = constants.GL_RGB;
            this.setImageData( 2, 2, 0, constants.GL_UNSIGNED_BYTE,blackWhiteCheckerboard, "tempTexture");
            _intformat = oldIntFormat;
        };

        Object.defineProperties(this,{
            /**
             *
             * @property textureId
             * @type {Number}
             */
            textureId:{
                value:_textureId
            },
            /**
             * Dimension of texture [width,height]
             * @property dimension
             * @type {vec2}
             */
            dimension:{
                get:function(){
                    return _dimension;
                }
            },
            /**
             * Unique identifier of the texture
             * @property uid
             * @type {Number}
             */
            uid:{
                value:_uid
            },
            /**
             * Identifier of the texture
             * @property dataURI
             * @type String
             */
            dataURI:{
                get:function(){
                    return _dataURI;
                }
            },
            /**
             * Texture.wrapS should be either GL_CLAMP_TO_EDGE or GL_REPEAT<br>
             * Default: GL_REPEAT
             * @property wrapS
             * @type Object
             */
            wrapS:{
                get: function(){
                    return _wrapS;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (value !== constants.GL_CLAMP_TO_EDGE &&
                            value !== constants.GL_REPEAT){
                            KICK.core.Util.fail("Texture.wrapS should be either GL_CLAMP_TO_EDGE or GL_REPEAT");
                        }
                    }
                    _wrapS = value;
                }
            },
            /**
             * Texture.wrapT should be either GL_CLAMP_TO_EDGE or GL_REPEAT<br>
             * Default: GL_REPEAT
             * @property wrapT
             * @type Object
             */
            wrapT:{
                get: function(){
                    return _wrapT;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (value !== constants.GL_CLAMP_TO_EDGE &&
                            value !== constants.GL_REPEAT){
                            KICK.core.Util.fail("Texture.wrapT should be either GL_CLAMP_TO_EDGE or GL_REPEAT");
                        }
                    }
                    return _wrapT;
                }
            },
            /**
             * Texture.minFilter should be either GL_NEAREST, GL_LINEAR, GL_NEAREST_MIPMAP_NEAREST, <br>
             * GL_LINEAR_MIPMAP_NEAREST, GL_NEAREST_MIPMAP_LINEAR, GL_LINEAR_MIPMAP_LINEAR<br>
             * Default: GL_LINEAR
             * @property minFilter
             * @type Object
             */
            minFilter:{
                get: function(){
                    return _minFilter;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (value !== constants.GL_NEAREST &&
                            value !== constants.GL_LINEAR &&
                            value !== constants.GL_NEAREST_MIPMAP_NEAREST &&
                            value !== constants.GL_LINEAR_MIPMAP_NEAREST &&
                            value !== constants.GL_NEAREST_MIPMAP_LINEAR &&
                            value !== constants.GL_LINEAR_MIPMAP_LINEAR){
                            KICK.core.Util.fail("Texture.minFilter should be either GL_NEAREST, GL_LINEAR, GL_NEAREST_MIPMAP_NEAREST, GL_LINEAR_MIPMAP_NEAREST, GL_NEAREST_MIPMAP_LINEAR, GL_LINEAR_MIPMAP_LINEAR");
                        }
                    }
                    _minFilter = value;
                }
            },
            /**
             * Texture.magFilter should be either GL_NEAREST or GL_LINEAR. <br>
             * Default: GL_LINEAR
             * @property magFilter
             * @type Object
             */
            magFilter:{
                get: function(){
                    return _magFilter;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (value !== constants.GL_NEAREST &&
                            value !== constants.GL_LINEAR){
                            KICK.core.Util.fail("Texture.magFilter should be either GL_NEAREST or GL_LINEAR");
                        }
                    }
                    _magFilter = value;
                }
            },
            /**
             * Scales image to nearest power of two if not a power of two. <br>
             * (Default true)
             * @property autoScaleImage
             * @type Boolean
             */
            autoScaleImage:{
                get: function(){
                    return _autoScaleImage;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (typeof value !== 'boolean'){
                            KICK.core.Util.fail("Texture.autoScaleImage was not be a boolean");
                        }
                    }
                    _autoScaleImage = value;
                }
            },
            /**
             * Autogenerate mipmap levels<br>
             * (Default true)
             * @property generateMipmaps
             * @type Boolean
             */
            generateMipmaps:{
                get: function(){
                    return _generateMipmaps;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (typeof value !== 'boolean'){
                            KICK.core.Util.fail("Texture.generateMipmaps was not a boolean");
                        }
                    }
                    _generateMipmaps = value;
                }
            },
            /**
             * When importing image flip the Y direction of the image
             * (Default true)
             * @property flipY
             * @type Boolean
             */
            flipY:{
                get: function(){
                    return _flipY;
                },
                set: function(value){
                    if (constants._ASSERT){
                        if (typeof value !== 'boolean'){
                            KICK.core.Util.fail("Texture.flipY was not a boolean");
                        }
                    }
                    _flipY = value;
                }
            },
            /**
             * Specifies the internal format of the image (format on GPU)<br>
             * Default is GL_RGBA<br>
             * Must be one of the following:
             * GL_ALPHA,
             * GL_RGB,
             * GL_RGBA,
             * GL_LUMINANCE,
             * GL_LUMINANCE_ALPHA
             */
            internalFormal:{
                get:function(){
                    return _intformat;
                },
                set:function(value){
                    if (value !== constants.GL_ALPHA &&
                        value !== constants.GL_RGB  &&
                        value !== constants.GL_RGBA &&
                        value !== constants.GL_LUMINANCE &&
                        value !== constants.GL_LUMINANCE_ALPHA){
                        KICK.core.Util.fail("Texture.internalFormal should be either GL_ALPHA, GL_RGB, GL_RGBA, GL_LUMINANCE, or LUMINANCE_ALPHA");
                    }
                    _intformat = value;
                }
            }
        });

        /**
         * Serializes the data into a JSON object (that can be used as a config parameter in the constructor)<br>
         * Note that the texture data is not serialized in the json format. <br>
         * This means that either setImage() or setImageData() must be called before the texture can be bound<br>
         * @method toJSON
         * @return {Object} config element
         */
        this.toJSON = function(){
            return {
                uid:_uid,
                wrapS:_wrapS,
                wrapT:_wrapT,
                minFilter:_minFilter,
                magFilter:_magFilter,
                generateMipmaps:_generateMipmaps,
                autoScaleImage:_autoScaleImage,
                dataURI:_dataURI,
                flipY:_flipY,
                internalFormal:_intformat
            };
        }
    };
})();