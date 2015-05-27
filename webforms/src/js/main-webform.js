/**
 * Default /webform
 */

require( [ 'require-config' ], function( rc ) {

    require( [ 'gui', 'cache', 'store', 'file-manager', 'controller-webform', 'jquery','fastclick' ],
        function( gui, cache, recordStore, fileStore, controller, $, FastClick ) {
	        
	        function reset() {
	        	console.log("Start web form");
	        	controller.init( 'form.or:eq(0)', {
	                recordStore: recordStore,
	                fileStore: fileStore,
	                submitInterval: 300 * 1000
	            } );
	        }
	        
        
	        $( document ).ready( function() {
	        	
	        	window.webForms = {		// Make controller global so it can be called by cordova app
	        			reset: reset,
	        			controller: controller
	        	}	
	           
	        	//FastClick.attach(document.body);		// Add FastClick to reduce delay on ios
	            
		        if(surveyData) {
		            controller.init( 'form.or:eq(0)', {
		                recordStore: recordStore,
		                fileStore: fileStore,
		                submitInterval: 300 * 1000
		            } );
		        }
	            
	        } );
            
        } );
} );
