import React, { Component } from 'react';
//import { Auth } from './Auth';
// import num from 'pretty-bytes';
import { num } from './Utils';

import { Container } from './Container';
import IconButton from 'material-ui/IconButton';

import CloudDownloadIcon from 'material-ui-icons/CloudDownload';
import FolderIcon from 'material-ui-icons/Folder';
import DeleteIcon from 'material-ui-icons/Delete';
import ShareIcon from 'material-ui-icons/Share';
import InfoIcon from 'material-ui-icons/Info';
import ContainerFileInfo from './ContainerFileInfo';
import ContainerFileDelete from './ContainerFileDelete';

import {
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';

class ContainerFile extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'file': props.file,
              'swift_url': props.swift_url,
              'directory': props.file.content_type === 'application/directory',
              'bucket': props.bucket,
              'showDetails': false,
              'deleteDialog': false,
              'onDelete': props.onDelete || null
          }
          this.share = this.share.bind(this);
          // console.log('new file',this.state.file);
          this.closeInfo = this.closeInfo.bind(this);
          this.deleteFile = this.deleteFile.bind(this);
          this.onDeleteDialogClose = this.onDeleteDialogClose.bind(this);
      }
    componentWillReceiveProps(nextProps){
        if(nextProps.file !== undefined && nextProps.file.last_modified !== this.state.file.last_modified){
            this.setState({'file': nextProps.file});
        }
    }
  isDirectory(){
      if(this.state.directory){
          return true;
      }
      else {
          return false;
      }
  }
  showInfo(){
      var ctx = this;
      return function(){
          ctx.setState({showDetails: true});
      }
  }
  closeInfo(){
      var ctx = this;
      ctx.setState({showDetails: false});
  }
  basename(){
      if(! this.state.file) { return ''}
      var dirs = this.state.file.name.split('/');
      if(this.isDirectory()){

          return dirs.splice(-2, 1);
      }
      return dirs.pop()
  }
  secondaryInfo(){
      if (! this.state.file) { return ''}
      // console.log('bytes',this.state.file);
      return new Date(this.state.file.last_modified).toLocaleString() + ', size:' + num(this.state.file.bytes );
  }
  download(){
      var ctx = this;
      return function(){
          Container.downloadContainerFile(ctx.state.bucket, '', ctx.state.file.name, function(res){
              if(res!==null && res.url !== undefined){
                  if(ctx.props.onDownload){
                      ctx.props.onDownload({'url': res.url});
                  }
                  window.open(res.url);

              }
              else {
                  if(ctx.props.onDownload){
                      ctx.props.onDownload({'error': 'Failed to download file'});
                  }
              }
          });
        }
  }
  share(){
      var ctx = this;
      return function(){
          Container.downloadContainerFile(ctx.state.bucket, '', ctx.state.file.name, function(res){
              if(res!==null && res.url !== undefined){
                  var file = ctx.state.file;
                  file.tmpurl = res.url;
                  ctx.setState({'file': file});
                  if(ctx.props.onShare){
                      ctx.props.onShare({'url': res.url});
                  }

              }
              else {
                  ctx.props.onShare({'error': 'Failed to create a temporary url'})();
              }
          });
        }
  }
  onDeleteDialogClose(file){
      var ctx = this;
      // console.log('onDeleteDialogClose', file, ctx.state.onDelete);
      ctx.setState({'deleteDialog' : false});
      if(file.cancel !== undefined){
          return;
      }
      if(file!==null && file.error === undefined){
          if(ctx.state.onDelete){
              ctx.state.onDelete({'msg': 'File(s) deleted'});
          }

      }
      else {
          if(ctx.state.onDelete){
              ctx.state.onDelete({'error': 'Failed to delete file'});
          }
      }

  }
  deleteFile(){
      var ctx = this;
      return function(){
            ctx.setState({'deleteDialog' : true});
      }
      /*
      var ctx = this;
      return function(){
          Container.deleteContainerFile(ctx.state.swift_url, ctx.state.file.name, function(res){
              if(res!==null){
                  if(ctx.props.onDelete){
                      ctx.props.onDelete({'msg': 'File deleted'});
                  }

              }
              else {
                  ctx.props.onDelete({'error': 'Failed to delete file'})();
              }
          });
        }
        */
  }
  gotoFolder(){
      var ctx=this;
      return function(){
          // console.log('gotoFolder', ctx.state.file);

          if(ctx.isDirectory()){
              if(ctx.props.onClick){
                  ctx.props.onClick(ctx.basename() + '/');
              }
          }

      }
  }
  render() {
    return (
        <TableRow key={this.state.file.name}>
        <TableRowColumn>
        {this.state.showDetails &&
            <ContainerFileInfo
            file={this.state.file}
            bucket={this.state.bucket}
            onClose={this.closeInfo}
            swift_url={this.state.swift_url}
            dialog={this.state.showDetails}/>
        }
            {!this.isDirectory() && <div style={{cursor: "pointer"}} onClick={this.showInfo()}>{this.basename()} <InfoIcon aria-label="Info" /></div>}
            {this.isDirectory() && <div style={{cursor: "pointer"}} onClick={this.gotoFolder()}><FolderIcon/> {this.basename()}</div>}

        </TableRowColumn>
        <TableRowColumn>
            {!this.isDirectory() && <p>{this.secondaryInfo()}</p>}
            {this.isDirectory() && <p>Folder</p>}
        </TableRowColumn>
        <TableRowColumn>

        <IconButton aria-label="Delete" onClick={this.deleteFile()}>
          <DeleteIcon />
        </IconButton>
        { this.state.deleteDialog && <ContainerFileDelete swift_url={this.state.swift_url} dialog={this.state.deleteDialog} file={this.state.file} onClose={this.onDeleteDialogClose}/>}
        {!this.isDirectory() &&  <IconButton aria-label="Share" onClick={this.share()}>
                  <ShareIcon />
                </IconButton>
        }
        {!this.isDirectory() &&  <IconButton aria-label="Download" onClick={this.download()}>
                  <CloudDownloadIcon />
                </IconButton>
        }

        </TableRowColumn>
        </TableRow>

    );
  }
}

export default ContainerFile;
