import React, { Component } from 'react';
import num from 'pretty-bytes';
// import { Card } from 'material-ui/Card';
import CircularProgress from 'material-ui/CircularProgress';
import DoneIcon from 'material-ui-icons/Done';

import './UploadProgress.css';

class UploadProgress extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'uploads': props.files,
          }
          console.log('UploadProgress', this.state);
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
  render() {
    return (
        <ul className="nav nav-pills flex-column">
            <li><h4 className="nav-item nav-link">Uploads</h4></li>
        {this.state.uploads.map((upload, index) => (
            <li className="nav-item nav-link" key={upload.name+'-'+upload.size}>
                <span className="uploadItem">{upload.name} ({num(upload.size)})</span>
                <CircularProgress
                  mode="determinate"
                  value={upload.progress}
                  size={20}
                  thickness={3}
                />
                { upload.progress === 100 && <DoneIcon/>}
            </li>
        ))}
        </ul>
    );
  }
}

export default UploadProgress;
