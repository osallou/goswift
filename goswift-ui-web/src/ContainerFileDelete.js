import React, { Component } from 'react';

import Dialog from 'material-ui/Dialog';
import { Container } from './Container';
import Config from './Config';
import LinearProgress from 'material-ui/LinearProgress';
import CircularProgress from 'material-ui/CircularProgress';
import FlatButton from 'material-ui/FlatButton';
import { Auth } from './Auth';

class ContainerFileDelete extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'swift_url': props.swift_url,
              'file': props.file,
              'dialog': props.dialog || false,
              'onClose': props.onClose,
              'error': '',
              'subobjects': [],
              'nbsubobjects': 0,
              'nbobjectdeleted': 0,
              'loading': true,
              'deleting': false,
              'deletionComplete': false
          }
          this.handleDialogCancel = this.handleDialogCancel.bind(this);
          this.handleDialogDelete = this.handleDialogDelete.bind(this);
          this.terminate = this.terminate.bind(this);
          this.elementsToDelete = [];
          this.checkInfo();
      };
      componentDidMount(){
          // get container object details
      };
      checkInfo(){
          var ctx = this;
          if(this.isDirectory()){
              console.log('delete directory');
              // get directory files info
              Container.listContainerSubFiles(this.state.swift_url, this.state.file.name, function(res){
                  console.log('directory subobjects', res);
                  ctx.setState({'subobjects': res, 'loading': false, 'nbsubobjects': res.length});
                  for(var i=0;i<res.length;i++){
                      ctx.elementsToDelete.push(res[i]);
                  }
                  ctx.elementsToDelete.push(ctx.state.file);
              });
          }
          else {
              var sub = [];
              var nbsub = 0;
              var config = Config.getConfig();
              var authData = Auth.getAuthData();
              Container.metaContainerFile(this.state.swift_url, this.state.file.name, function(res){
                  if(res.about.complex){
                      ctx.state.file.complex = true;
                      console.log('complex object', res.about);
                      var subcontainerPath = res.about.complex_url.split('/');
                      var swift_url = config.swift_url + '/v1/AUTH_' + authData.project + '/' + subcontainerPath[0];
                      Container.listContainerSubFiles(swift_url, subcontainerPath.slice(1).join('/'), function(res){
                          for(var i=0;i<res.length;i++){
                              res[i].swift_url = swift_url;
                              res[i].complex = false;
                              ctx.elementsToDelete.push(res[i]);
                          }
                          console.log('file subobjects', res);
                          sub = res;
                          nbsub = res.length;
                          ctx.setState({'loading': false, 'subobjects': sub, 'nbsubobjects': nbsub});
                          ctx.elementsToDelete.push(ctx.state.file);
                      });
                  }
                  else {
                      ctx.state.file.complex = false;
                      ctx.setState({'loading': false});
                      ctx.elementsToDelete.push(ctx.state.file);
                  }

              });
          }
      }
      isDirectory(){
          if(this.state.file.content_type === 'application/directory'){
              return true;
          }
          return false;
      }
      terminate(){
          //this.setState({'error': '', 'dialog': false, 'deleting': false});
          this.setState({'error': '', 'deletionComplete': true, 'deleting': false});
          this.elementsToDelete = [];
          /*
          if(this.state.onClose){
              console.log('call delete onclose', this.state.file);
              this.state.onClose(this.state.file);
          }
          */
      }
      deleteFile(){
          var ctx = this;
          console.log('call deletefile');
          var file = this.elementsToDelete.shift();
          if(file === undefined){
              this.terminate();
              return;
          }

          // if complex not defined, need to check it
          // put back in list
          if(file.complex === undefined){
              if(file.bytes === undefined || file.bytes === 0){
                  Container.metaContainerFile(this.state.swift_url, file.name, function(res){
                      if(res.about.complex){
                          file.complex = true;
                          console.log('complex object', res.about);
                          var subcontainerPath = res.about.complex_url.split('/');
                          var authData = Auth.getAuthData();
                          var config = Config.getConfig();
                          var swift_url = config.swift_url + '/v1/AUTH_' + authData.project + '/' + subcontainerPath[0];
                          Container.listContainerSubFiles(swift_url, subcontainerPath.slice(1).join('/'), function(res){
                              console.log('complex object subparts', res);
                              ctx.elementsToDelete.unshift(file);
                              for(var i=0;i<res.length;i++){
                                  res[i].swift_url = swift_url;
                                  res[i].complex = false;
                                  ctx.elementsToDelete.unshift(res[i]);
                              }
                              ctx.setState({'nbsubobjects': ctx.state.nbsubobjects + res.length});
                              ctx.deleteFile();
                          });
                          return;
                      }
                      else {
                          file.complex = false;
                          ctx.elementsToDelete.unshift(file);
                          ctx.deleteFile();
                          return;
                      }
                  });
                  return;
              }
          }

          var url = this.state.swift_url;
          if(file.swift_url !== undefined){
              url = file.swift_url;
          }
          Container.deleteContainerFile(url, file.name, function(res){
              if(res.error !== undefined){
                  console.log('deletion error', res);
                  ctx.setState({'error': 'Failed to delete file ' + file.name});
                  return;
              }
              else {
                  ctx.setState({'nbobjectdeleted': (ctx.state.nbsubobjects+1)-ctx.elementsToDelete.length, 'deleting': true});
                  ctx.deleteFile();
              }
          });
      }
      componentWillReceiveProps(nextProps){
        console.log('new container file info props', nextProps);
        var ctx = this;
        if(nextProps.file !== undefined){
                ctx.setState({
                    'file': nextProps.file,
                    'dialog': nextProps.dialog,
                    'onClose': nextProps.onClose,
                    'swift_url': nextProps.swift_url,
                    'error': '',
                    'subobjects': [],
                    'nbsubobjects': 0,
                    'nbobjectdeleted': 0,
                    'loading': true,
                    'deleting': false,
                    'deletionComplete': false
                });
                this.checkInfo();

        }
      }

  handleDialogCancel(){
      this.setState({'dialog': false});
      if(this.state.onClose){
          console.log('call cancel onclose', this.state.file);
          if(this.state.nbobjectdeleted>0){
              this.state.onClose({'nbobjectdeleted': this.state.nbobjectdeleted});
          }
          else {
              this.state.onClose({'cancel': true});
          }
      }
  }
  handleDialogDelete(){
      console.log('should delete', this.state.subobjects);
      var ctx = this;
      ctx.setState({'deletionComplete': false});
      ctx.deleteFile();
      /*
      ctx.setState({'error': '', 'dialog': false});
      if(ctx.state.onClose){
          console.log('call delete onclose', ctx.state.file);
          ctx.state.onClose(ctx.state.file);
      }
      */
  }

  render() {
      const actions = [
            <FlatButton
              label="Delete"
              disabled={this.state.deleting || this.state.loading || this.state.deletionComplete}
              primary={true}
              keyboardFocused={true}
              onClick={this.handleDialogDelete}
            />,
            <FlatButton
              label="Close"
              disabled={this.state.deleting}
              primary={true}
              keyboardFocused={true}
              onClick={this.handleDialogCancel}
            />,
        ];
    if(!this.state.dialog) {
         return null;
    }


    return (
        <Dialog
          title={this.state.file.name}
          modal={true}
          actions={actions}
          open={this.state.dialog}
          onRequestClose={this.handleDialogCancel}
          autoScrollBodyContent={true}
        >
            { this.state.error && <div class="label label-error">{this.state.error}</div>}
            <div>{this.state.loading &&  <CircularProgress />}</div>
            { this.state.deleting && <LinearProgress mode="determinate" value={this.state.nbobjectdeleted/(this.state.nbsubobjects+1)*100} />}
            <div className="row">
            <p>Delete {this.state.file.name} <span> [ {this.state.nbsubobjects} sub elements ]</span> ?</p>
            {this.state.deleting && <p>Deleting {this.state.nbobjectdeleted} / {this.state.nbsubobjects+1}</p>}
            </div>
            <div>{this.state.deletionComplete && <p>Files deleted!!</p>}</div>

        </Dialog>
    );
  }
}

export default ContainerFileDelete;
