import React, { Component } from 'react';
import $ from 'jquery';
import num from 'pretty-bytes';
import { Container } from './Container';
import Dropzone from 'react-dropzone';
import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import { Card } from 'material-ui/Card';
import { Auth } from './Auth';

import './UploadZone.css';

class UploadZone extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'swift_url': props.swift_url,
              'path': props.path,
              'progress': [],
              'total': [],
              'onUpload': props.onUpload,
              'onError': props.onError,
              'onProgress': props.onProgress,
              'onOver': props.onOver
          }
          this.uploadProgress = {};
          this.uploadTimer = null;
          this.timerInterval = 5000;
          this.onDrop = this.onDrop.bind(this);
          this.counter = 0;
          console.log("state", this.state);

      };
      checkUploads(){
        // console.log('check for uploads', this.uploadProgress);
        var files = Object.keys(this.uploadProgress);
        for(var i=0;i<files.length;i++){
            //var file = files[i];
            var file = this.uploadProgress[files[i]];
            if(this.state.onProgress && !file.complete){
                this.state.onProgress(file);
            }
            if(this.state.onOver && file.complete){
                this.state.onOver(file);
            }
            if(file.complete){
                delete this.uploadProgress[file.id];
            }
        }

      };
      componentWillUnmount(){
          clearInterval(this.uploadTimer);
      };
      componentDidMount(){
          var ctx = this;
          this.uploadTimer = setInterval(function(){
              ctx.checkUploads();
          }, ctx.timerInterval);
      };
  fileId(file){
      file.id = file.name + '-' + file.size + '-' + this.counter;
      this.counter++;
      return file.id;
  }
  uploadFile(file, index){
      var ctx = this;
      if(this.state.onUpload){
          file.progress = 0;
          file.complete = false;
          this.state.onUpload(file);
      }
      var authData = Auth.getAuthData();
      var progress = this.state.progress.slice();
      progress.push(0);
      //console.log('progress', progress);
      var total = this.state.total.slice();
      total.push(file.size);
      this.fileId(file);
      this.uploadProgress[file.id] = file;
      //console.log('total', total);
      this.setState({'progress': progress, 'total': total});
      // console.log('state1', this.state, progress, total);
      // console.log('index', index);
      var ctx = this;

      $.ajax({
          url: ctx.state.swift_url + '/' + ctx.state.path + file.name +'?format=json',
          beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', authData.token);},
          type: "PUT",
          data: file,
          cache: false,
          contentType: false,
          processData: false,
          // Custom XMLHttpRequest
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if (myXhr.upload) {
                    // For handling the progress of the upload
                    myXhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            // console.log('state2', ctx.state);
                            var progress = ctx.state.progress.slice();
                            progress[index] = e.loaded;
                            ctx.setState({'progress': progress});
                            console.log('progress', ctx.state, e.loaded, e.total);
                            ctx.uploadProgress[file.id].progress = (e.loaded * 100 / e.total);
                        }
                    } , false);
                    myXhr.upload.addEventListener('load', function(e) {
                        console.log('upload completed');
                        file.complete = true;
                    } , false);
                    myXhr.upload.addEventListener('error', function(e) {
                        console.log('error occured', e);
                        delete ctx.uploadProgress[file.id];
                        if(ctx.state.onError){
                            ctx.state.onError(file);
                        }
                    } , false);
                }
                return myXhr;
            },
      });

  }
  onDrop(accepted, rejected){
      console.log('swift: ',this.state.swift_url, 'path: ', this.state.path);
      if(this.state.swift_url === undefined || this.state.swift_url === null){
          console.log('no url defined yet for upload');
          if(this.state.onError){
              this.state.onError({'error': 'no url defined yet for upload', 'msg': 'select a container'})
          }
          return;
      }
      console.log(accepted,rejected);
      for(var i=0;i<accepted.length;i++){
          console.log('upload ', accepted[i]);
          this.uploadFile(accepted[i], i);
      }
  }
  render() {
    return (
        <Dropzone className="UploadZone" onDrop={this.onDrop}>
            <CloudUploadIcon/>
        </Dropzone>
    );
  }
}

export default UploadZone;
