import React, { Component } from 'react';
import { Auth } from './Auth';
import { Redirect } from 'react-router-dom'
import UploadZone from './UploadZone';
import UploadProgress from './UploadProgress';
import { Container } from './Container';
import ContainerFile from './ContainerFile';
import ContainerInfo from './ContainerInfo';
// import { List, ListItem, ListItemText, ListItemSecondaryAction } from 'material-ui/List';
import FlatButton from 'material-ui/FlatButton';
import InfoIcon from 'material-ui-icons/Info';
import DeleteIcon from 'material-ui-icons/Delete';
// import ActionInfo from 'material-ui/svg-icons/action/info';
import CreateNewFolderIcon from 'material-ui-icons/CreateNewFolder';
// import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import Divider from 'material-ui/Divider';

import { GridList, GridTile } from 'material-ui/GridList';
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
            'dirs': [],
            'notif': false,
            'notif_msg': '',
            'dialog': false,
            'dialog_msg': '',
            'newFolder': '',
            'newContainer': '',
            'uploads': [],
            'containerInfoDialog': false,
            'containerInfoName': null
        }
        this.authTimer = null;
        this.uploader = null;
        this.expired = this.expired.bind(this);
        Container.onExpiration(this.expired);
        this.getContainers();
        this.changeFolder = this.changeFolder.bind(this);
        this.createFolder = this.createFolder.bind(this);
        this.createContainer = this.createContainer.bind(this);
        this.changeContainer = this.changeContainer.bind(this);
        this.share = this.share.bind(this);
        this.download = this.download.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
        this.gotoFolder = this.gotoFolder.bind(this);
        this.gotoFolderIndex = this.gotoFolderIndex.bind(this);
        this.fileUpload = this.fileUpload.bind(this);
        this.fileUploadProgress = this.fileUploadProgress.bind(this);
        this.fileUploadOver = this.fileUploadOver.bind(this);
        this.fileUploadError = this.fileUploadError.bind(this);
        this.showContainerInfo = this.showContainerInfo.bind(this);
        this.showContainer = this.showContainer.bind(this);
        this.closeContainerInfo = this.closeContainerInfo.bind(this);
        this.deleteContainer = this.deleteContainer.bind(this);
        this.handleNotifClose = this.handleNotifClose.bind(this);
        this.handleDialogClose = this.handleDialogClose.bind(this);

  }
  componentWillUnmount(){
      clearInterval(this.authTimer);
  };
  componentDidMount(){
      // var ctx = this;
      this.authTimer = setInterval(function(){
          Auth.reauth();
      }, 1000 * 60 * 10); // 10 minutes timer
  };
  expired(){
      console.log('session expired, logout and redirect to login');
      Auth.logout();
      this.setState({'fireRedirect': true});
  }
  getContainers() {
      var ctx = this;
      Container.listContainers(function(msg){
          if(msg.error){
              if(msg.status === 401){
                  Auth.logout();
                  ctx.setState({'fireRedirect': true});
              }
              else {
                  ctx.setState({
                          'notif': true,
                          'notif_msg': msg.error,
                  });
              }
              return;
          }
          console.log(msg.containers);
          ctx.setState({'containers': msg.containers});

      });

  }
  deleteContainer(containerName){
      var ctx = this;
      return function(){
          Container.deleteContainer(ctx.state.swift_url, containerName, function(msg){
              if(msg.error){
                  ctx.setState({
                          'notif': true,
                          'notif_msg': msg.error,
                  });
              }
              else {
                  ctx.setState({
                          'container': null
                  });
                  ctx.getContainers();
              }
          });
      }
  }
  showContainerInfo(containerName){
      var ctx = this;
      return function(){
          console.log('show cont info now', containerName);
          ctx.setState({containerInfoDialog: true, containerInfoName: containerName});
      }
  }
  closeContainerInfo(){
      var ctx = this;
          console.log('close container info');
          ctx.setState({containerInfoDialog: false});
  }
  gotoFolderIndex(folderIndex){
      var ctx = this;
      return function(){
          // console.log("go to folderindex ", folderIndex);
          var newpath = [];
          if(folderIndex > -1){
              newpath = ctx.state.path.slice(0, folderIndex + 1);
          }
          ctx.setState({'path': newpath, 'linearpath': newpath.join('')});
          Container.listContainerDirectory(ctx.state.swift_url, newpath.join(''), function(res){
              // console.log('new folder:',res);
              var files_and_dirs = ctx.get_files_and_dirs(res);
              ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs});
          });
      }

  }
  gotoFolder(folder){
      var ctx = this;
      // console.log('request folder ', folder);
      var subpath = ctx.state.path.concat(folder);
      ctx.setState({'path': subpath, 'linearpath': subpath.join('')});
      Container.listContainerDirectory(ctx.state.swift_url, subpath.join(''), function(res){
          // console.log('folder change', folder, res);
          var files_and_dirs = ctx.get_files_and_dirs(res);
          ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs});
      });
  }
  listContainer(container){
      var ctx = this;
      Container.listContainerDirectory(this.state.swift_url, this.state.path.join(''), function(res){
          //console.log(res);
          var files_and_dirs = ctx.get_files_and_dirs(res);
          ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs});
      });
  }
  get_files_and_dirs(res){
      var files = [];
      var dirs = []
      for(var i=0;i<res.length;i++){
          var file = res[i];
          if(file.content_type === 'application/directory'){
              dirs.push(file);
          }
          else{
              files.push(file);
          }
      }
      return({'files': files, 'dirs': dirs});
  }
  showContainer(index){
      // request will by the same time set quotas and enable cors
      //this.setState({'container': this.state.containers[index]});
      console.log('Get container info for ', this.state.containers[index]);
      var ctx = this;
      Container.getContainerDetails(this.state.containers[index].name, [], function(res){
          if(res === null) {
              Auth.logout();
              ctx.setState({'fireRedirect': true});
              return;
          }
         console.log('container details', res);
         var files_and_dirs = ctx.get_files_and_dirs(res.container);
         ctx.setState({
            'files': files_and_dirs.files,
            'dirs': files_and_dirs.dirs,
            'swift_url': res.swift_url,
            'container': ctx.state.containers[index],
            'path': []
        });
      });
  }
  deleteFile(msg){
      console.log('delete event', msg);
      if(msg.error){
          this.setState({
                  'notif': true,
                  'notif_msg': msg.error,
          })
      }
      else {
          this.getContainers();
          this.setState({'notif': true, 'notif_msg': 'File deleted'});
          this.listContainer(this.state.container.name);
      }
  }
  download(msg){
      console.log('download event', msg);
      if(msg.error){
          this.setState({
                  'notif': true,
                  'notif_msg': msg.error,
          })
      }
  }
  share(msg){
      console.log('share event', msg);
      if(msg.error){
          this.setState({
                  'notif': true,
                  'notif_msg': msg.error,
          })
      }
      else{
          this.setState({
                  'notif': true,
                  'notif_msg': 'Share url, valid for 30 days',
                  'dialog': true,
                  'dialog_msg': msg.url,
          })
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
              ctx.setState({'notif': true, 'notif_msg': 'Select first a container/bucket'});
              return;
          }
          // console.log('should create', ctx.state.path, ctx.state.newFolder);
          Container.createDirectory(ctx.state.swift_url, ctx.state.path, ctx.state.newFolder, function(res){
              ctx.setState({'newFolder': ''});
              // console.log(res);
              Container.listContainerDirectory(ctx.state.swift_url, ctx.state.path.join(''), function(res){
                  var files_and_dirs = ctx.get_files_and_dirs(res);
                  ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs});
              });
          })
      }
  }
  createContainer(){
      var ctx = this;
      return function(){
          if(ctx.state.newContainer === "") {
              return;
          }
          Container.createContainer(ctx.state.newContainer, function(msg){
              if(msg.error){
                  ctx.setState({
                          'notif': true,
                          'notif_msg': msg.error,
                  });
              }
              else {
                ctx.setState({'newContainer': ''});
                ctx.getContainers();
              }
          })
      }
  }
  changeContainer(event){
      var ctx = this;
      return function(event){
        ctx.setState({'newContainer': event.target.value});
      }
  }
  handleNotifClose () {
      this.setState({
        notif: false,
      });
  };
  handleDialogClose () {
      this.setState({
        dialog: false
      });
  };
  /*
  componentDidUpdate(prevProps, prevState){
      console.log('homeupdate', prevProps, prevState, this.state);
  }
  */
  fileUpload(file){
      console.log('file upload', file);
      // console.log('state', this.state);
      var uploadFiles = this.state.uploads.slice();
      uploadFiles.push(file);
      // console.log('uploads', uploadFiles);
      this.setState((state) => {
          state.uploads = state.uploads.concat([file]);
          return state;
      })
  }
  fileUploadProgress(file){
      var uploadFiles = this.state.uploads.slice();
      this.setState({'uploads': uploadFiles});
      // console.log('file upload progress', file.name, file.progress, file.size);
  }
  fileUploadOver(file){
      // console.log('over uploads', this.state.uploads);
      var uploadFiles = this.state.uploads.slice();
      this.setState({'uploads': uploadFiles});
      console.log('file upload over', file);
      this.listContainer(this.state.container.name);
  }
  fileUploadError(file){
      console.log('file upload error', file);
      this.setState({
              'notif': true,
              'notif_msg': file.error,
      });
  }
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

          <ContainerInfo
          file={this.state.containerInfoName}
          onClose={this.closeContainerInfo}
          dialog={this.state.containerInfoDialog}/>

        <div className="col-sm-3">
            <h4>Containers</h4>
            <ul className="nav nav-pills flex-column">
            <li><TextField
                floatingLabelText="container name"
                name="newContainer"
                onChange={this.changeContainer()}
                value={this.state.newContainer}/>
                <CreateNewFolderIcon onClick={this.createContainer()}/>
                <Divider/>
            </li>


            {this.state.containers.map((container, index) => (
                <li key={container.name}>
                    <FlatButton label={container.name} onClick={this.showContainer.bind(this, index)}/>
                    <InfoIcon onClick={this.showContainerInfo(container.name)}/>
                </li>
            ))}
            </ul>
            <UploadProgress files={this.state.uploads}/>
        </div>
        <div className="col-sm">
            { this.state.container &&
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                  <li key="-1" className="breadcrumb-item" onClick={this.gotoFolderIndex(-1)}>[{this.state.container && this.state.container.name}]:root</li>
              {this.state.path.map((cpath, index) => (
                  <li key={index} className="breadcrumb-item" onClick={this.gotoFolderIndex(index)}>{cpath.replace('/','')}</li>
              ))}
                   <li key="delete" className="breadcrum-item">
                   <FlatButton aria-label="Delete" onClick={this.deleteContainer(this.state.container.name)}>
                     <DeleteIcon />
                   </FlatButton>
                   </li>
              </ol>

            </nav>
            }
            { this.state.container &&
            <GridList cellHeight={120} cols={2}>
                <GridTile key="1" col="1" title="Upload drop zone">
                    <UploadZone
                        swift_url={this.state.swift_url}
                        path={this.state.path.join()}
                        onUpload={this.fileUpload}
                        onProgress={this.fileUploadProgress}
                        onOver={this.fileUploadOver}
                        onError={this.fileUploadError}
                    />


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
            }
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
            {this.state.dirs.map((containerFile, index) =>(
                <GridTile key={containerFile.name}>
                <ContainerFile
                    swift_url={this.state.swift_url}
                    file={containerFile}
                    bucket={this.state.container.name}
                    onShare={this.share}
                    onDownload={this.download}
                    onDelete={this.deleteFile}
                    onClick={this.gotoFolder}
                />
                </GridTile>

            ))}
            {this.state.files.map((containerFile, index) =>(
                <GridTile key={containerFile.name}>
                <ContainerFile
                    swift_url={this.state.swift_url}
                    file={containerFile}
                    bucket={this.state.container.name}
                    onShare={this.share}
                    onDownload={this.download}
                    onDelete={this.deleteFile}
                    onClick={this.gotoFolder}
                />

                </GridTile>

            ))}
            </GridList>
        </div>
      </div>
    );
  }
}

export default Home;
