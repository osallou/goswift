import React, { Component } from 'react';
import { Auth } from './Auth';
import { Redirect } from 'react-router-dom'
import UploadZone from './UploadZone';
import UploadProgress from './UploadProgress';
import { Container } from './Container';
import ContainerFile from './ContainerFile';
import ContainerInfo from './ContainerInfo';
import SearchContainer from './SearchContainer';
// import { List, ListItem, ListItemText, ListItemSecondaryAction } from 'material-ui/List';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import InfoIcon from 'material-ui-icons/Info';
import MailIcon from 'material-ui-icons/Mail';
import SearchIcon from 'material-ui-icons/Search';
import DeleteIcon from 'material-ui-icons/Delete';
// import ActionInfo from 'material-ui/svg-icons/action/info';
import CreateNewFolderIcon from 'material-ui-icons/CreateNewFolder';
// import CloudUploadIcon from 'material-ui-icons/CloudUpload';
import { num } from './Utils';
import Dialog from 'material-ui/Dialog';
import TextField from 'material-ui/TextField';
import {
  Table,
  TableBody,
  TableRow,
  TableHeader,
  TableHeaderColumn,
} from 'material-ui/Table';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
// import IconMenu from 'material-ui/IconMenu';
// import DropDownMenu from 'material-ui/DropDownMenu';
// import IconButton from 'material-ui/IconButton';
// import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

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
            'containerInfoName': null,
            'search': false,
            'quota': 0,
            'used': 0,
            'shareUrlEmails': '',
            'new': '',
            'typeNew': '',
            'openNew': false
        }
        this.authTimer = null;
        this.uploader = null;
        this.expired = this.expired.bind(this);
        Container.onExpiration(this.expired);
        this.getContainers();
        this.changeFolder = this.changeFolder.bind(this);
        this.searchFiles = this.searchFiles.bind(this);
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
        this.shareUrlInvite = this.shareUrlInvite.bind(this);
        this.shareUrlUpdateEmails = this.shareUrlUpdateEmails.bind(this);

        this.changeNew = this.changeNew.bind(this);
        this.showNew = this.showNew.bind(this);
        this.handleCancelNew = this.handleCancelNew.bind(this);
        this.handleCreateNew = this.handleCreateNew.bind(this);
        this.isContainerSelected = this.isContainerSelected.bind(this);

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

  changeNew(event){
      var ctx = this;
      return function(event){
        ctx.setState({'new': event.target.value});
      }
  }
  showNew(type){
      var ctx = this;
      var eventType = type;
      return function(){
        console.log('show new container')
        ctx.setState({'openNew': true, 'typeNew': eventType});
      }
  }
  handleCancelNew(){
      this.setState({'openNew': false});
  }
  handleCreateNew(){
      var ctx = this;
      if(this.state.typeNew === 'container'){
          if(ctx.state.new === "") {
              return;
          }
          Container.createContainer(ctx.state.new, function(msg){
              if(msg.error){
                  ctx.setState({
                          'notif': true,
                          'notif_msg': msg.error,
                  });
              }
              else {
                ctx.setState({'new': ''});
                ctx.getContainers();
              }
          })
      }
      else if(this.state.typeNew === 'folder'){
          if(ctx.state.swift_url === null) {
              ctx.setState({'notif': true, 'notif_msg': 'Select first a container/bucket'});
              return;
          }
          Container.createDirectory(ctx.state.swift_url, ctx.state.path, ctx.state.new, function(res){
              ctx.setState({'new': ''});
              Container.listContainerDirectory(ctx.state.swift_url, ctx.state.path.join(''), function(res){
                  var files_and_dirs = ctx.get_files_and_dirs(res);
                  ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs});
              });
          })
      }
      this.setState({'openNew': false});
  }
  shareUrlInvite(url){
      var ctx = this;
      var tmpurl = url;
      return function(){
        var invites = ctx.state.shareUrlEmails.split(',').map(function(item) {
            return item.trim();
        });
        Container.inviteContainer(tmpurl, invites, function(msg){
            if(msg.error !== undefined){
                ctx.setState({
                        'notif': true,
                        'notif_msg': 'Failed to send invitation',
                });
            }
            else{
                ctx.setState({
                        'notif': true,
                        'notif_msg': 'Invitation sent',
                });
            }
        })
      }
  }
  shareUrlUpdateEmails(event){
      var ctx = this;
      return function(event){
        ctx.setState({'shareUrlEmails': event.target.value});
      }
  }
  searchFiles(){
      var ctx = this;
      return function(){
          ctx.setState({'search': true});
      }
  }
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
          // console.log(msg.containers);
          var total = 0;
          for(var i=0;i<msg.containers.length;i++){
              total += msg.containers[i].bytes;
          }
          ctx.setState({'containers': msg.containers, 'quota': msg.quota, 'used': total});

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
          // console.log('show cont info now', containerName);
          ctx.setState({containerInfoDialog: true, containerInfoName: containerName});
      }
  }
  isContainerSelected(containerName){
      if(this.state.container && this.state.container.name === containerName){
          return {"backgroundColor": "lightgrey"};
      }
      else {
          return {};
      }
  }
  closeContainerInfo(){
      var ctx = this;
          // console.log('close container info');
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

      var subpath = ctx.state.path;
      if(folder !== "") {
          subpath = ctx.state.path.concat(folder);
      }
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
          ctx.setState({'files': files_and_dirs.files, 'dirs': files_and_dirs.dirs, 'search': false});
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
  // function(event: object, menuItem: object, index: number)
  //showContainer(index){
  showContainer(event, menuItem, index){
      // request will by the same time set quotas and enable cors
      //this.setState({'container': this.state.containers[index]});
      // console.log('Get container info for ', this.state.containers[index]);
      var ctx = this;
      Container.getContainerDetails(this.state.containers[index].name, [], function(res){
          if(res === null) {
              Auth.logout();
              ctx.setState({'fireRedirect': true, 'search': false});
              return;
          }
         // console.log('container details', res);
         if(res.error !== undefined){
             ctx.setState({
                     'notif': true,
                     'notif_msg': res.error || 'Cannot access container',
             })
             return;
         }
         ctx.setState({
            'swift_url': res.swift_url,
            'container': ctx.state.containers[index],
            'path': [],
            'search': false
         });
         ctx.gotoFolder('');

      });
  }
  deleteFile(msg){
      // console.log('delete event', msg);
      if(msg.error){
          this.setState({
                  'notif': true,
                  'notif_msg': msg.error,
          })
      }
      else {
          this.getContainers();
          this.setState({'notif': true, 'notif_msg': 'File(s) deleted'});
          this.listContainer(this.state.container.name);
      }
  }
  download(msg){
      // console.log('download event', msg);
      if(msg.error){
          this.setState({
                  'notif': true,
                  'notif_msg': msg.error,
          })
      }
  }
  share(msg){
      // console.log('share event', msg);
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
      // console.log('file upload', file);
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
          const actionsNew = [
            <FlatButton
              label="Cancel"
              primary={true}
              onClick={this.handleCancelNew}
            />,
            <FlatButton
              label="Create"
              primary={true}
              keyboardFocused={true}
              onClick={this.handleCreateNew}
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

            <Menu
                desktop={true}
                onItemClick={this.showContainer}
                disableAutoFocus={true}
            >

            {this.state.containers.map((container, index) => (
                <MenuItem
                    style={this.isContainerSelected(container.name)}
                    key={container.name}
                    primaryText={container.name}
                    value={container.name}
                    leftIcon={<InfoIcon onClick={this.showContainerInfo(container.name)}/>}
                />

            ))}
            </Menu>
            <Menu>
            <RaisedButton
              key="newcontainer"
              primary={true}
              onClick={this.showNew('container')}
              label="Create container"
              icon={<CreateNewFolderIcon/>}
             />
             </Menu>
             { this.state.container &&
                 <Menu>
                 <RaisedButton
                  secondary={true}
                  onClick={this.deleteContainer(this.state.container.name)}
                  label="Delete container"
                  icon={<DeleteIcon/>}
                  /></Menu>
              }

            <Divider />
            <FlatButton primary={true} label={"Quota: " + num(this.state.used) + " / "+ num(this.state.quota)}/>
            <Divider />
            <Menu
                desktop={true}
                disableAutoFocus={true}
            >
            </Menu>
            <Divider />


            <UploadProgress files={this.state.uploads}/>
        </div>

        <Dialog
          title={"Create new " + this.state.typeNew}
          actions={actionsNew}
          modal={false}
          open={this.state.openNew}
          onRequestClose={this.handleCancelNew}
        >
            <TextField
                floatingLabelText="name"
                name="newName"
                onChange={this.changeNew()}
                value={this.state.new}/>
        </Dialog>

        { this.state.search && <div className="col-sm"><SearchContainer container={this.state.container}/></div>}
        { !this.state.search && <div className="col-sm">
            { this.state.container &&
            <div>
            <nav className="navbar">
                <form className="form-inline my-2 my-lg-0">
                    <RaisedButton
                     primary={true}
                     onClick={this.showNew('folder')}
                     label="Create folder"
                     icon={<CreateNewFolderIcon/>}
                     />
                 </form>
                 { this.state.container &&
                 <form className="form-inline my-2 my-lg-0">
                 <UploadZone
                     swift_url={this.state.swift_url}
                     path={this.state.path.join()}
                     onUpload={this.fileUpload}
                     onProgress={this.fileUploadProgress}
                     onOver={this.fileUploadOver}
                     onError={this.fileUploadError}
                 />
                 </form>
                }
               <form className="form-inline my-2 my-lg-0">
                   <RaisedButton
                    primary={true}
                    onClick={this.searchFiles()}
                    label="Search"
                    icon={<SearchIcon/>}
                    />
                </form>
            </nav>
            <nav className="navbar navbar-light">
              <ol className="breadcrumb">
                  <li key="-1" className="breadcrumb-item" onClick={this.gotoFolderIndex(-1)}>[{this.state.container && this.state.container.name}]:root</li>
              {this.state.path.map((cpath, index) => (
                  <li key={index} className="breadcrumb-item" onClick={this.gotoFolderIndex(index)}>{cpath.replace('/','')}</li>
              ))}
              </ol>

            </nav>
            </div>


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
              <span className="shareUrl">{this.state.dialog_msg}</span>
              <div className="shareInvitations">
              <h4>Send invitation</h4>
              <TextField
                  floatingLabelText="emails, comma separated"
                  name="shareUrlEmails"
                  onChange={this.shareUrlUpdateEmails()}
                  value={this.state.shareUrlEmails}
                  />
                  <RaisedButton
                   primary={true}
                   onClick={this.shareUrlInvite(this.state.dialog_msg)}
                   label="Invite"
                   icon={<MailIcon/>}
                   />
              </div>
            </Dialog>

            <Table >
            <TableHeader>
            <TableRow>
            <TableHeaderColumn>Name</TableHeaderColumn>
            <TableHeaderColumn>Info</TableHeaderColumn>
            <TableHeaderColumn>Actions</TableHeaderColumn>
            </TableRow>
            </TableHeader>
            <TableBody>
            {this.state.dirs.map((containerFile, index) =>(
                <ContainerFile key={containerFile.name}
                    swift_url={this.state.swift_url}
                    file={containerFile}
                    bucket={this.state.container.name}
                    onShare={this.share}
                    onDownload={this.download}
                    onDelete={this.deleteFile}
                    onClick={this.gotoFolder}
                />
            ))}
            {this.state.files.map((containerFile, index) =>(
                <ContainerFile key={containerFile.name}
                    swift_url={this.state.swift_url}
                    file={containerFile}
                    bucket={this.state.container.name}
                    onShare={this.share}
                    onDownload={this.download}
                    onDelete={this.deleteFile}
                    onClick={this.gotoFolder}
                />
            ))}
            </TableBody>
            </Table>
        </div>}
      </div>
    );
  }
}

export default Home;
