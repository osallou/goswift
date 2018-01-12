import React, { Component } from 'react';
import { Auth } from './Auth';
import { Redirect } from 'react-router-dom'
import $ from 'jquery';
import num from 'pretty-bytes';
import { Container } from './Container';
import { List, ListItem, ListItemText, ListItemSecondaryAction } from 'material-ui/List';
import ActionInfo from 'material-ui/svg-icons/action/info';
import CreateNewFolderIcon from 'material-ui-icons/CreateNewFolder';
import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import CloudDownloadIcon from 'material-ui-icons/CloudDownload';
import FolderIcon from 'material-ui-icons/Folder';
import DeleteIcon from 'material-ui-icons/Delete';
import ShareIcon from 'material-ui-icons/Share';

import IconButton from 'material-ui/IconButton';
import { GridList, GridTile } from 'material-ui/GridList';
import { Card, CardText, CardHeader, CardActions } from 'material-ui/Card';
import { Paper } from 'material-ui/Paper';
import Snackbar from 'material-ui/Snackbar';


class Home extends Component {
  constructor(props) {
        super(props);
        const auth = Auth.getAuthData();
        this.state = {
            'containers': [],
            'project': auth.project,
            'token': auth.token,
            'fireRedirect': false,
            'container': null,
            'path': '/',
            'files': [],
            'notif': false
        }
        this.getContainers();
        this.download = this.download.bind(this);
  }
  getContainers() {
      var ctx = this;
      $.ajax({
          url: "http://localhost:6543/api/v1/project/" + ctx.state.project,
          beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', ctx.state.token);},
          type: "GET",
          dataType: "json",
          success: function(res){
              //callback({'status': true});
              console.log(res);
              console.log(res.containers);
              ctx.setState({'containers': res.containers});
          },
          error: function(jqXHR, textStatus, error){
              //callback({'status': false, 'msg': error});
              if(jqXHR.status === 401){
                  Auth.logout();
                  ctx.setState({'fireRedirect': true});
              }
              console.log('Failed to get containers ' + error);
          }
      });
  }
  showContainer(index){
      // request will by the same time set quotas and enable cors
      this.setState({'container': this.state.containers[index]});
      console.log('Get container info for ', this.state.containers[index]);
      var ctx = this;
      Container.getContainerDetails(this.state.containers[index]['name'], this.state.path, function(res){
          if(res === null) {
              Auth.logout();
              ctx.setState({'fireRedirect': true});
              return;
          }
         console.log('container details', res);
         ctx.setState({'files': res.container});
      });
  }
  secondaryInfo(containerFile){
      return containerFile.last_modified + ', size:' + num(containerFile.bytes);
  }
  download(containerFile){
      var ctx = this;
      return function(){
          console.log('Download ', containerFile, ctx.state);
          Container.downloadContainerFile(ctx.state.container.name, ctx.state.path, containerFile.name, function(res){
              if(res!==null && res.url !== undefined){
                  window.open(res.url)
              }
              else {
                  ctx.setState({'notif': true});
              }
              //console.log('tempurl: ',res);
          });
        }
  }
  handleRequestClose = () => {
      this.setState({
        notif: false,
      });
  };
  render() {
    return (
      <div className="row">
      {this.state.fireRedirect && (<Redirect to={'/'}/>)}
        <div className="col-sm-3">
            <h4>Containers</h4>
            <ul className="nav nav-pills flex-column">
            {this.state.containers.map((container, index) => (
                <li onClick={this.showContainer.bind(this, index)} key={index} data-toggle="tooltip" data-placement="right"  title={container.last_modified} className="nav-item nav-link active">{container.name} <span className="badge badge-light">{container.count}</span></li>
            ))}
            </ul>
        </div>
        <div className="col-sm">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
              {this.state.path.split('/').map((cpath, index) => (
                  <li key={index} className="breadcrumb-item">{cpath}</li>
              ))}
              </ol>
            </nav>
            <GridList cellHeight={120} cols={2}>
                <GridTile key="1" col="1" title="Upload">
                    <CloudUploadIcon/>
                </GridTile>
                <GridTile key="2" col="1" title="Create folder">
                    <CreateNewFolderIcon/>
                </GridTile>
            </GridList>
            <Snackbar
                open={this.state.notif}
                message="Failed to download file"
                autoHideDuration={4000}
                onRequestClose={this.handleRequestClose}
            />
            <GridList>
            {this.state.files.map((containerFile, index) =>(
                <GridTile key={index}>
                <Card>
                    <CardHeader title={containerFile.name} subtitle={this.secondaryInfo(containerFile)}/>
                    <CardActions>
                                <IconButton aria-label="Delete">
                                  <DeleteIcon />
                                </IconButton>
                                <IconButton aria-label="Share">
                                  <ShareIcon />
                                </IconButton>
                                <IconButton aria-label="Download" onClick={this.download(containerFile)}>
                                  <CloudDownloadIcon />
                                </IconButton>
                    </CardActions>
                </Card>
                </GridTile>

            ))}
            </GridList>
        </div>
      </div>
    );
  }
}

export default Home;
