import React, { Component } from 'react';
import { Auth } from './Auth';
import { Redirect } from 'react-router-dom'
import $ from 'jquery';
import num from 'pretty-bytes';
import { Container } from './Container';
// import { List, ListItem, ListItemText, ListItemSecondaryAction } from 'material-ui/List';
import FlatButton from 'material-ui/FlatButton';
// import ActionInfo from 'material-ui/svg-icons/action/info';
import CreateNewFolderIcon from 'material-ui-icons/CreateNewFolder';
import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import CloudDownloadIcon from 'material-ui-icons/CloudDownload';
import FolderIcon from 'material-ui-icons/Folder';
import DeleteIcon from 'material-ui-icons/Delete';
import ShareIcon from 'material-ui-icons/Share';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import Divider from 'material-ui/Divider';

import IconButton from 'material-ui/IconButton';
import { GridList, GridTile } from 'material-ui/GridList';
import { Card, CardText, CardHeader, CardActions } from 'material-ui/Card';
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
            'swift_url': null,
            'path': [],
            'linearpath': '',
            'files': [],
            'notif': false,
            'notif_msg': '',
            'dialog': false,
            'dialog_msg': '',
            'newFolder': ''
        }
        this.uploader = null;
        this.getContainers();
        this.changeFolder = this.changeFolder.bind(this);
        this.createFolder = this.createFolder.bind(this);
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
  gotoFolderIndex(folderIndex){
      var ctx = this;
      return function(){
          console.log("go to folderindex ", folderIndex);
          var newpath = [];
          if(folderIndex > -1){
              newpath = ctx.state.path.slice(0, folderIndex + 1);
          }
          ctx.setState({'path': newpath, 'linearpath': newpath.join('')});
          Container.listContainerDirectory(ctx.state.swift_url, newpath.join(''), function(res){
              console.log(res);
              ctx.setState({'files': res});
          });
      }

  }
  gotoFolder(folder){
      var ctx = this;
      return function(){
          console.log('request folder ', folder);
          var subpath = ctx.state.path;
          subpath.push(folder);
          //console.log('Go to folder ', subpath);
          ctx.setState({'path': subpath, 'linearpath': subpath.join('')});
          Container.listContainerDirectory(ctx.state.swift_url, subpath.join(''), function(res){
              console.log(res);
              ctx.setState({'files': res});
          });
      };
  }
  showContainer(index){
      // request will by the same time set quotas and enable cors
      this.setState({'container': this.state.containers[index]});
      console.log('Get container info for ', this.state.containers[index]);
      var ctx = this;
      Container.getContainerDetails(this.state.containers[index].name, this.state.path, function(res){
          if(res === null) {
              Auth.logout();
              ctx.setState({'fireRedirect': true});
              return;
          }
         console.log('container details', res);
         ctx.setState({'files': res.container, 'swift_url': res.url});
      });
  }
  secondaryInfo(containerFile){
      return containerFile.last_modified + ', size:' + num(containerFile.bytes);
  }
  deleteFile(containerFile, index){
      var ctx = this;
      return function(){
          console.log('Download ', containerFile, ctx.state);
          Container.deleteContainerFile(ctx.state.swift_url, containerFile.name, function(res){
              console.log('delete', res)
              if(res!==null){
                  var files = ctx.state.files;
                  var container = ctx.state.container;
                  container.count -= 1;
                  files.splice(index, 1);
                  ctx.setState({'notif': true, 'notif_msg': 'File deleted', 'files': files, 'container': container});
              }
              else {
                  ctx.setState({'notif': true, 'notif_msg': 'Failed to delete file'});
              }
              //console.log('tempurl: ',res);
          });
        }
  }
  download(containerFile, index){
      var ctx = this;
      return function(){
          console.log('Download ', containerFile, ctx.state);
          Container.downloadContainerFile(ctx.state.container.name, ctx.state.path, containerFile.name, function(res){
              if(res!==null && res.url !== undefined){
                  window.open(res.url)
              }
              else {
                  ctx.setState({'notif': true, 'notif_msg': 'Failed to download file'});
              }
              //console.log('tempurl: ',res);
          });
        }
  }
  uploadFile(containerFile){
      var ctx = this;
      Container.getTmpUrlForUploadContainerFile(ctx.state.container.name, ctx.state.path, containerFile.name, function(res){

      });
  }
  share(containerFile, index){
      var ctx = this;
      return function(){
          console.log('Share ', containerFile, ctx.state);
          Container.downloadContainerFile(ctx.state.container.name, ctx.state.path, containerFile.name, function(res){
              if(res!==null && res.url !== undefined){
                  var files = ctx.state.files;
                  //files[index].tmpurl = res.url;
                  ctx.setState({
                    'notif': true,
                    'notif_msg': 'Share url, valid for 30 days',
                    'files': files,
                    'dialog': true,
                    'dialog_msg': res.url,
                    'newFolder':  ''
                })
              }
              else {
                  ctx.setState({'notif': true, 'notif_msg': 'Failed to create a temporary url'});
              }
              //console.log('tempurl: ',res);
          });
        }
  }
  changeFolder(event){
      var ctx = this;
      return function(event){
        ctx.setState({'newFolder': event.target.value});
      }
  }
  createFolder(){
      var ctx = this;
      return function() {
          if(ctx.state.swift_url === null) {
              ctx.setState({'notif': true, 'notif_msg': 'Select first a container/bucket'})
              return;
          }
          console.log('should create', ctx.state.newFolder);
          Container.createDirectory(ctx.state.swift_url, ctx.state.newFolder, function(res){
              ctx.setState({'newFolder': ''});
              console.log(res);
          })
      }
  }
  handleNotifClose = () => {
      this.setState({
        notif: false,
      });
  };
  handleDialogClose = () => {
      this.setState({
        dialog: false
      });
  };
  render() {
      const actions = [
            <FlatButton
              label="Close"
              primary={true}
              keyboardFocused={true}
              onClick={this.handleDialogClose}
            />,
          ];
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
                  <li key="-1" className="breadcrumb-item" onClick={this.gotoFolderIndex(-1)}>root</li>
              {this.state.path.map((cpath, index) => (
                  <li key={index} className="breadcrumb-item" onClick={this.gotoFolderIndex(index)}>{cpath.replace('/','')}</li>
              ))}
              </ol>
            </nav>
            <GridList cellHeight={120} cols={2}>
                <GridTile key="1" col="1" title="Upload">
                    <CloudUploadIcon/>
                </GridTile>
                <GridTile key="2" col="1" title="Create folder">
                <TextField
                    floatingLabelText="folder name"
                    name="newFolder"
                    onChange={this.changeFolder()}
                    value={this.state.newFolder}/>
                    <CreateNewFolderIcon onClick={this.createFolder()}/>
                </GridTile>
            </GridList>
            <Divider />
            <Snackbar
                open={this.state.notif}
                message={this.state.notif_msg}
                autoHideDuration={4000}
                onRequestClose={this.handleNotifClose}
            />
            <Dialog
              title="Share temporary url"
              modal={true}
              actions={actions}
              open={this.state.dialog}
              onRequestClose={this.handleDialogClose}
            >
              {this.state.dialog_msg}
            </Dialog>
            <GridList>
            {this.state.files.map((containerFile, index) =>(
                <GridTile key={index}>
                <Card>
                    {containerFile.content_type !== 'application/directory' && <CardHeader title={containerFile.name.replace(this.state.linearpath,'')} subtitle={this.secondaryInfo(containerFile)}></CardHeader>}
                    {containerFile.content_type === 'application/directory' && <CardHeader title={containerFile.name.replace(this.state.linearpath,'')} onClick={this.gotoFolder(containerFile.name)}><FolderIcon/></CardHeader>}

                    {containerFile.tmpurl && <CardText className="text-muted"><small>{containerFile.tmpurl}</small></CardText>}
                    <CardActions>
                        <IconButton aria-label="Delete" onClick={this.deleteFile(containerFile, index)}>
                          <DeleteIcon />
                        </IconButton>
                        {containerFile.content_type !== 'application/directory' &&  <IconButton aria-label="Share" onClick={this.share(containerFile, index)}>
                                  <ShareIcon />
                                </IconButton>
                        }
                        {containerFile.content_type !== 'application/directory' &&  <IconButton aria-label="Download" onClick={this.download(containerFile, index)}>
                                  <CloudDownloadIcon />
                                </IconButton>
                        }
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
