import $ from 'jquery';
import { Auth } from './Auth';

const PENDING = 0;
const RUNNING = 1;

class UploadHandler {
    constructor(){
        this.status = PENDING;
        this.error_callback = null;
        this.complete_callback = null;
    }
    upload(file){
        var authData = Auth.getAuthData();
        console.log('start transfer of', JSON.stringify(file));
        file.uploading = true;
        $.ajax({
            url: file.url  +'?format=json',
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
            type: "PUT",
            data: file,
            cache: false,
            contentType: false,
            processData: false,
            // Custom XMLHttpRequest
              xhr: function() {
                  var myXhr = $.ajaxSettings.xhr();
                  var file_to_upload = file;
                  if (myXhr.upload) {
                      // For handling the progress of the upload
                      myXhr.upload.addEventListener('progress', function(e) {
                          // console.log('progress', e);
                          if (e.lengthComputable) {
                              file_to_upload.progress = (e.loaded * 100 / e.total);
                          }
                      } , false);
                      myXhr.upload.addEventListener('load', function(e) {
                          // console.log('upload completed', e);
                          file_to_upload.complete = true;
                          if(this.complete_callback){
                            this.complete_callback(file_to_upload);
                          }
                          this.status = PENDING;
                      } , false);
                      myXhr.upload.addEventListener('error', function(e) {
                          console.log('error occured', e);
                          file_to_upload.error = true;
                          if(this.error_callback){
                            this.error_callback(file_to_upload);
                          }
                          this.status = PENDING;
                      } , false);
                  }
                  return myXhr;
              },
        });

    }
    onError(callback){
        this.error_callback = callback;
    }
    onComplete(callback){
        this.complete_callback = callback;
    }
    raiseError(){
        if(this.error_callback){
            this.error_callback();
        }
    }

}

export class UploadManager {
    constructor(num_workers, onCompleteCallback, onErrorCallback){
        this.handlers = [];
        for(var i=0;i<num_workers;i++){
            var newHandler = new UploadHandler();
            newHandler.onComplete(onCompleteCallback);
            newHandler.onError(onErrorCallback);
            this.handlers.push(newHandler);
        }
    }


    addWorker(){
        this.handlers.push(new UploadHandler());
    }
    doUploads(uploads){
        var handler = null;
        var files = Object.keys(uploads);
        if(files.length>0){
            console.log("upload pending files");
        }
        for(var i=0;i<files.length;i++){
            if(uploads[files[i]].uploading){
                console.log('already uploading, skipping', JSON.stringify(files[i]));
                continue;
            }
            handler=this.getAvailableHandler();
            if(handler === null){return;}
            handler.upload(uploads[files[i]]);
        }
    }
    getAvailableHandler(){
        for(var i=0;i<this.handlers.length;i++){
            var handler = this.handlers[i];
            if(handler.status === PENDING){
                handler.status = RUNNING;
                return handler;
            }
        }
        return null;
    }


    /**
    * Get number of running handlers
    */
    status(){
        var count = 0;
        for(var i=0;i<this.handlers.length;i++){
            count += this.handlers[i].status;
        }
        return count;
    }
}
