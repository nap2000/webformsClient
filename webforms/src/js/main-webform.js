/**
 * Default /webform
 */

require( [ 'require-config' ], function( rc ) {

    require( [ 'gui', 'cache', 'store', 'file-manager', 'controller-webform', 'jquery','fastclick' ],
        function( gui, cache, recordStore, fileStore, controller, $, FastClick ) {

            $( document ).ready( function() {
            	FastClick.attach(document.body);		// Add FastClick to reduce delay on ios
                controller.init( 'form.or:eq(0)', {
                    recordStore: recordStore,
                    fileStore: fileStore,
                    submitInterval: 300 * 1000
                } );
            } );
            
        } );
} );
