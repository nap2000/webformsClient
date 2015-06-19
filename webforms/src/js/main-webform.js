/**
 * Default /webform
 */

require( [ 'require-config' ], function( rc ) {

    require( [ 'gui', 'cache', 'store', 'file-manager', 'controller-webform', 'jquery','fastclick' ],
        function( gui, cache, recordStore, fileStore, controller, $, FastClick ) {
	        
        
	        $( document ).ready( function() {
	        	
	        	window.enketo = controller; 		// Make controller global so it can be called by cordova app
	            
		        if(typeof surveyData !== "undefined") {
		            controller.init( 'form.or:eq(0)', {
		                recordStore: recordStore,
		                fileStore: fileStore,
		                submitInterval: 300 * 1000
		            } );
		        }
	            
	        } );
            
        } );
} );
