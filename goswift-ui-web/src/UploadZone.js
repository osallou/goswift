import React, { Component } from 'react';
// import $ from 'jquery';
import Dropzone from 'react-dropzone';
import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import RaisedButton from 'material-ui/RaisedButton';

// import { Auth } from './Auth';
import { UploadManager } from './UploadManager';
import './UploadZone.css';

class UploadZone extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'swift_url': props.swift_url,
              'path': props.path,
              //'progress': [],
              //'total': [],
              'onUpload': props.onUpload,
              'onError': props.onError,
              'onProgress': props.onProgress,
              'onOver': props.onOver
          }
          this.uploadProgress = {};
          this.uploadTimer = null;
          this.timerInterval = 5000;
          this.onDrop = this.onDrop.bind(this);
          this.onFileUpload = this.onFileUpload.bind(this);
          this.counter = 0;
          // console.log("state", this.state);
          this.manager = new UploadManager(2, function(file){
              // console.log('completed', file);
              delete this.uploadProgress[file.id];
          },function(file){
              console.log('error', file);
              delete this.uploadProgress[file.id];
          });

      };
      componentWillReceiveProps(nextProps){
        // console.log('new uploadzone file info props', nextProps);
        var ctx = this;
        if(nextProps.swift_url !== undefined && nextProps.swift_url !== null){
            ctx.setState({
                'path': nextProps.path,
                'swift_url': nextProps.swift_url
            });

        }
      }


      checkUploads(){
        // console.log('check for uploads', this.uploadProgress);
        this.manager.doUploads(this.uploadProgress);
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
      file.uploading = false;
      if(this.state.onUpload){
          file.progress = 0;
          file.complete = false;
          this.state.onUpload(file);
      }
      /*
      if(file.type === '') {
          file.error = 'Directory upload not supported';
          //file.complete = true;
          file.progress = 100;
          if(this.state.onError){
              this.state.onError(file);
          }
          return;
      }*/
      // file.url = this.state.swift_url
      // Set full url for upload manager
      file.url = this.state.swift_url + '/' + this.state.path + file.name;

      // var authData = Auth.getAuthData();

      this.fileId(file);
      this.uploadProgress[file.id] = file;

      /*
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
                var file_to_upload = file;
                if (myXhr.upload) {
                    // For handling the progress of the upload
                    myXhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            ctx.uploadProgress[file_to_upload.id].progress = (e.loaded * 100 / e.total);
                        }
                    } , false);
                    myXhr.upload.addEventListener('load', function(e) {
                        console.log('upload completed');
                        file_to_upload.complete = true;
                    } , false);
                    myXhr.upload.addEventListener('error', function(e) {
                        console.log('error occured', e);
                        file_to_upload.error = true;
                        delete ctx.uploadProgress[file_to_upload.id];
                        if(ctx.state.onError){
                            ctx.state.onError(file_to_upload);
                        }
                    } , false);
                }
                return myXhr;
            },
      });
      */

  }
  onDrop(accepted, rejected){
      // console.log('swift: ',this.state.swift_url, 'path: ', this.state.path);
      if(this.state.swift_url === undefined || this.state.swift_url === null){
          console.log('no url defined yet for upload');
          if(this.state.onError){
              this.state.onError({'error': 'no url defined yet for upload', 'msg': 'select a container'})
          }
          return;
      }
      // console.log(accepted,rejected);
      for(var i=0;i<accepted.length;i++){
          console.log('upload ', accepted[i]);
          this.uploadFile(accepted[i], i);
      }
  }
  onFileUpload(e){
      this.onDrop(e.target.files);
  }
  render() {
    return (
        <div>
        <div className="upload-btn-wrapper" style={{
                position: "relative",
                overflow: "hidden",
                display: "inline-block",
                cursor: "pointer"
            }}>
            <RaisedButton
             primary={true}
             label="Import a file"
             icon={<CloudUploadIcon/>}
             />
            <input onChange={this.onFileUpload} type="file" name="myfile" style={{cursor: "pointer", opacity: 0, position: "absolute", left: 0, top:0}} />
        </div>

        </div>
    );
  }
}
/*
<Dropzone className="UploadZone" onDrop={this.onDrop}>
    lower than 5Gb, use swiftclient for larger uploads <CloudUploadIcon/>
</Dropzone>
*/

export default UploadZone;
