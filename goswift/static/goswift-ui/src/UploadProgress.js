import React, { Component } from 'react';
import num from 'pretty-bytes';
// import { Card } from 'material-ui/Card';
import CircularProgress from 'material-ui/CircularProgress';
import DeleteIcon from 'material-ui-icons/Delete';

import './UploadProgress.css';

class UploadProgress extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'uploads': props.files,
          }
          console.log('UploadProgress', this.state);
          this.clear = this.clear.bind(this)
      };
      componentDidUpdate(prevProps, prevState){
          console.log('uploadprogressupdate', prevProps, 'oldstate',prevState, 'newstate', this.state);
      }
      componentWillReceiveProps(nextProps){
        console.log('new props', nextProps);
        if(nextProps.files !== undefined && nextProps.files.length > 0){
            this.setState({uploads: nextProps.files.slice()});
        }
      }
  clear(){
      var ctx = this;
      return function(){
          console.log('clear');
          var newuploads = [];
          var olduploads = this.state.uploads.slice();
          this.state.uploads.forEach(function(upload){
              if(!upload.complete){
                  newuploads.push(upload);
              }
          });
          ctx.setState({'uploads': newuploads});
      }
  }
  statusColor(uploadFile){
      if(uploadFile.complete){
          return 'green';
      }
      else if(uploadFile.error){
          return 'red';
      }
      else {
          return 'blue';
      }
  }
  render() {
    return (
        <ul className="nav nav-pills flex-column">
            <li><h4 className="nav-item nav-link">Uploads  <DeleteIcon onClick={this.clear()}/></h4></li>
        {this.state.uploads.map((upload, index) => (
            <li className="nav-item nav-link" key={upload.name+'-'+upload.size}>
                <span className="uploadItem">{upload.name} ({num(upload.size)})</span>
                <CircularProgress
                  mode="determinate"
                  value={upload.progress}
                  size={20}
                  thickness={3}
                  color={this.statusColor(upload)}
                />
            </li>
        ))}
        </ul>
    );
  }
}

export default UploadProgress;
