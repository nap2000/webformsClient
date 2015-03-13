/**
 * @preserve Copyright 2013 Martijn van de Rijdt
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'jquery', 'enketo-js/extend' ], function( $ ) {
    "use strict";

    var RESERVED_KEYS = [ 'user_locale', '__settings', 'null', '__history', 'Firebug', 'undefined', '__bookmark', '__counter', '__current_server', '__loadLog', '__writetest', '__maxSize' ],
        localStorage = window.localStorage;

    // Could be replaced by Modernizr function if Modernizr remains used in final version
    function isSupported() {
        try {
            return 'localStorage' in window && window[ 'localStorage' ] !== null;
        } catch ( e ) {
            return false;
        }
    }

    function isWritable() {
        var result = setRecord( '__writetest', 'x', null, true );
        if ( result === 'success' ) {
            removeRecord( '__writetest' );
            return true;
        }
        return false;
    }

    //used for testing
    function getForbiddenKeys() {
        return RESERVED_KEYS;
    }

    /**
     * saves a data object in JSON format (string)
     * @param {string} newKey    [description]
     * @param {*} record     [description]
     * @param {boolean=} del [description] used to change name of existing record and delete old record
     * @param {boolean=} overwrite [description] overwrite is only used when there is *another* record with the same new name (not when simply updating current form)
     * @param {?string=} oldKey    [description]
     * @return {string}
     */
    function setRecord( newKey, record, del, overwrite, oldKey ) {
        var error;
        if ( !newKey || typeof newKey !== 'string' || newKey.length < 1 ) {
            //console.error( 'no key or empty key provided for record: ' + newKey );
            return 'require';
        }
        newKey = newKey.trim();
        oldKey = ( typeof oldKey === 'string' ) ? oldKey.trim() : null;
        overwrite = ( typeof overwrite !== 'undefined' && overwrite === true ) ? true : false;

        //using the knowledge that only survey data is provided as a "data" property (and is a string)
        if ( typeof record[ 'data' ] === 'string' && isReservedKey( newKey ) ) {
            return 'forbidden';
        }
        if ( typeof record[ 'data' ] === 'string' &&
            ( oldKey !== newKey && isExistingKey( newKey ) && overwrite !== true ) ||
            ( oldKey === newKey && overwrite !== true ) ) {
            return 'existing';
        }
        try {
            //add timestamp to survey data
            if ( typeof record[ 'data' ] === 'string' ) {
                record[ 'lastSaved' ] = ( new Date() ).getTime();
                //if (newKey == getCounterValue() ){
                localStorage.setItem( '__counter', JSON.stringify( {
                    'counter': getCounterValue()
                } ) );

                //}
            }
            localStorage.setItem( newKey, JSON.stringify( record ) );
            //console.debug( 'saved: ' + newKey + ', old key was: ' + oldKey );
            //if the record was loaded from the store (oldKey != null) and the key's value was changed during editing
            //delete the old record if del=true
            if ( oldKey !== null && oldKey !== '' && oldKey !== newKey ) {
                if ( del ) {
                    console.log( 'going to remove old record with key:' + oldKey );
                    removeRecord( oldKey );
                }
            }
            return 'success';
        } catch ( e ) {
            if ( e && e.code === 22 ) { //} (e.name==='QUOTA_EXCEEDED_ERR'){
                return 'full (or browser is set to not allow storage)';
            }
            console.log( 'error in store.setRecord:', e );
            error = ( e ) ? JSON.stringify( e ) : 'unknown';
            return 'error: ' + error;
        }
    }


    /**
     * Returns a form data record as an object. This is the only function that obtains records from the local storage.
     * @param  {string} key [description]
     * @return {?*}     [description]
     */
    function getRecord( key ) {
        var record;
        try {
            var x = localStorage.getItem( key );
            record = JSON.parse( localStorage.getItem( key ) );
            return record;
        } catch ( e ) {
            console.error( 'error with loading data from store: ' + e.message );
            return null;
        }
    }

    // removes a record
    function removeRecord( key ) {
        try {
            localStorage.removeItem( key );
            if ( !isReservedKey( key ) ) {
                //TODO remove this single jQuery dependency
                $( 'form.or' ).trigger( 'delete', JSON.stringify( getRecordList() ) );
            }
            return true;
        } catch ( e ) {
            console.log( 'error with removing data from store: ' + e.message );
            return false;
        }
    }

    /**
     * Returns a list of locally stored form names and properties for a provided server URL
     * @param  {string} serverURL
     * @return {Array.<{name: string, server: string, title: string, url: string}>}
     */
    function getFormList( serverURL ) {
        if ( typeof serverURL == 'undefined' ) {
            return null;
        }
        return /**@type {Array.<{name: string, server: string, title: string, url: string}>}*/ getRecord( '__server_' + serverURL );
    }

    /**
     * returns an ordered array of objects with record keys and final variables {{"key": "name1", "draft": true},{"key": "name2", etc.
     * @return { Array.<Object.<string, (boolean|string)>>} [description]
     */
    function getRecordList() {
        var formList = [],
            records = getSurveyRecords( false );

        records.forEach( function( record ) {
            formList.push( {
                'key': record.key,
                'draft': record.draft,
                'lastSaved': record.lastSaved
            } );
        } );
        console.debug( 'formList returning:', formList );

        //order formList by lastSaved timestamp
        formList.sort( function( a, b ) {
            return a[ 'lastSaved' ] - b[ 'lastSaved' ];
        } );
        return formList;
    }

    /**
     * retrieves all survey data
     * @param  {boolean=} finalOnly   [description]
     * @param  {?string=} excludeName [description]
     * @return {Array.<Object.<(string|number), (string|boolean)>>}             [description]
     */
    function getSurveyRecords( finalOnly, excludeName ) {
        var i, key,
            records = [],
            record = {};
        finalOnly = ( typeof finalOnly !== 'undefined' ) ? finalOnly : false;
        excludeName = excludeName || null;

        for ( i = 0; i < localStorage.length; i++ ) {
            key = localStorage.key( i );
            if ( !isReservedKey( key ) ) {

                // get record - all non-reserved keys contain survey data
                record = getRecord( key );

                try {
                    record.key = key;
                    //=== true comparison breaks in Google Closure compiler.
                    if ( key !== excludeName && ( !finalOnly || !record.draft ) ) {
                        records.push( record );
                    }
                } catch ( e ) {
                    console.log( 'record found that was probably not in the expected JSON format' +
                        ' (e.g. Firebug settings or corrupt record) (error: ' + e.message + '), record was ignored' );
                }
            }
        }

        return records;
    }

    /**
     * [getSurveyDataArr description]
     * @param  {boolean=} finalOnly   [description]
     * @param  {?string=} excludeName the (currently open) record name to exclude from the returned data set
     * @return {Array.<{name: string, data: string}>}             [description]
     */
    function getSurveyDataArr( finalOnly, excludeName ) {
        var i, records,
            dataArr = [];

        finalOnly = ( typeof finalOnly !== 'undefined' ) ? finalOnly : true;
        excludeName = excludeName || null;
        return getSurveyRecords( finalOnly, excludeName );
    }


    function getExportStr() {
        var dataStr = '';

        getSurveyDataArr( false ).forEach( function( record ) {
            dataStr += '<record name="' + record.key + '" lastSaved="' + record.lastSaved + '"' +
                ( record.draft ? ' draft="true()"' : '' ) +
                '>' + record.data + '</record>';
        } );

        return dataStr;
    }

    /**
     * private function to check if key is forbidden
     * @param  {string}  k [description]
     * @return {boolean}   [description]
     */

    function isReservedKey( k ) {
        var i;
        for ( i = 0; i < RESERVED_KEYS.length; i++ ) {
            if ( k === RESERVED_KEYS[ i ] ) {
                return true;
            }
        }
        return false;
    }

    /**
     * private function to check if the key exists
     * @param  {string}  k [description]
     * @return {boolean}   [description]
     */

    function isExistingKey( k ) {
        if ( localStorage.getItem( k ) ) {
            //console.log('existing key');// DEBUG
            return true;
        }
        //console.log('not existing key');// DEBUG
        return false;
    }

    /**
     * Obtain a new counter string value that is one higher than the previous
     * @return {?(string|String)} [description]
     */
    function getCounterValue() {
        var record = getRecord( '__counter' ),
            number = ( record && record[ 'counter' ] && isNumber( record[ 'counter' ] ) ) ? Number( record[ 'counter' ] ) : 0,
            numberStr = ( number + 1 ).toString().pad( 4 );

        return numberStr;
    }


    function isNumber( n ) {
        return !isNaN( parseFloat( n ) ) && isFinite( n );
    }

    return {
        isSupported: isSupported,
        isWritable: isWritable,
        getForbiddenKeys: getForbiddenKeys,
        getRecord: getRecord,
        setRecord: setRecord,
        removeRecord: removeRecord,
        getFormList: getFormList,
        getRecordList: getRecordList,
        getExportStr: getExportStr,
        getSurveyRecords: getSurveyRecords,
        getSurveyDataArr: getSurveyDataArr,
        getCounterValue: getCounterValue
    };
} );
