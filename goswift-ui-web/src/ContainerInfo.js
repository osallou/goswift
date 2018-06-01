import React, { Component } from 'react';
// import num from 'pretty-bytes';
import { Auth } from './Auth';
import { Card, CardText, CardHeader } from 'material-ui/Card';
import Dialog from 'material-ui/Dialog';
import { Container } from './Container';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import { GridList, GridTile } from 'material-ui/GridList';
import RaisedButton from 'material-ui/RaisedButton';
import Checkbox from 'material-ui/Checkbox';

class ContainerInfo extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'container': props.container,
              'metas': [],
              'dialog': props.dialog || false,
              'onClose': props.onClose,
              'web_hook': '',
              'hook_regexp': '',
              'public': false,
              'website': false
          }
          this.project = Auth.getAuthData().project;
          this.handleDialogClose = this.handleDialogClose.bind(this);
          this.handleDialogSave = this.handleDialogSave.bind(this);
          this.setHook = this.setHook.bind(this);
          this.updateHook = this.updateHook.bind(this);
          this.updateHookRegexp = this.updateHookRegexp.bind(this);
          this.setVisibility = this.setVisibility.bind(this);
          this.handleWebsite = this.handleWebsite.bind(this);

      };
      componentDidMount(){
          // get container object details
          var ctx = this;
          if(this.state.container){
              Container.getContainerMeta(this.state.container, function(res){
                  if(res.error !== undefined) {
                      console.log('failed to get container', res);
                      return;
                  }
                  console.log('metas', res);
                  ctx.setState('metas': res);
              });
              Container.getContainerHook(this.state.container, function(res){
                  if(res.error !== undefined) {
                      ctx.setState({'web_hook': '', 'hook_regexp': ''});
                      console.log('failed to get container hook', res);
                      return;
                  }
                  if(res.hook){
                      ctx.setState({'web_hook': res.hook, 'hook_regexp': res.regexp});
                  }
                  else{
                      ctx.setState({'web_hook': '', 'hook_regexp': ''});
                  }
              });
          }
      };

      componentWillReceiveProps(nextProps){
        var ctx = this;
        if(nextProps.dialog && nextProps.file !== undefined && nextProps.file!=null){
            // console.log('show cont info',nextProps.file);
            Container.getContainerMeta(nextProps.file, function(res){
                console.log('container metas', res);
                if(res.error === undefined){
                    ctx.setState({
                        'container': nextProps.file,
                        'dialog': nextProps.dialog,
                        'metas': res
                    });
                    // console.log('set metas',res,nextProps.dialog);
                }
            });
            if(this.state.container){
                Container.getContainerHook(this.state.container, function(res){
                    if(res.error !== undefined) {
                        ctx.setState({'web_hook': '', 'hook_regexp': ''});
                        console.log('failed to get container hook', res);
                        return;
                    }
                    if(res.hook){
                        ctx.setState({'web_hook': res.hook, 'hook_regexp': res.regexp});
                    }
                    else {
                        ctx.setState({'web_hook': '', 'hook_regexp': ''});
                    }
                });
                Container.getVisibility(this.state.container, function(res){
                    if(res.error !== undefined) {
                        console.log('failed to get container visibility', res);
                        return;
                    }
                    if(res.acl_read !== null || res.acl_write !== null){
                        ctx.setState({'public': true});
                    }
                    else {
                        ctx.setState({'public': false});
                    }
                    if(res.web){
                        console.log('web listing enabled');
                        ctx.setState({'website': true})
                    }
                    else {
                        ctx.setState({'website': false})
                    }
                    console.log('visibility', res) ;
                });
            }
        }
      }
  setVisibility(is_public){
      var ctx = this;
      return function(){
          if(is_public){
              console.log('set public');
          }
          else{
              console.log('set private');
          }
          Container.setVisibility(ctx.state.container, is_public, '.r:*,.rlistings', ctx.web, function(res){

              if(res && res.error !== undefined) {
                  console.log('failed to set visibility');
              }
              else {
                  ctx.setState({'public': is_public});
              }
          });
      };
  }
  setHook(){
        var ctx = this;
        return function(){
              Container.setContainerHook(ctx.state.container, ctx.state.web_hook, ctx.state.hook_regexp,function(res){
                  if(res.error !== undefined) {
                      console.log('failed to set container hook', res);
                      return;
                  }
              });
        };
      }
  updateHook(event){
          var ctx = this;
          return function(event){
            ctx.setState({'web_hook': event.target.value});
          }
      }
  updateHookRegexp(event){
          var ctx = this;
          return function(event){
            ctx.setState({'hook_regexp': event.target.value});
          }
      }

  handleDialogClose(){
      this.setState({'dialog': false});
      if(this.state.onClose){
          this.state.onClose(this.state.file, this.state.meta);
      }
  }
  handleDialogSave(){
      this.setState({'dialog': false});
      if(this.state.onClose){
          this.state.onClose(this.state.file, this.state.meta);
      }
  }
  handleWebsite(event){
      var ctx = this;
      return function(event){
          console.log('website',event.target.checked);
          var value = event.target.checked;
          Container.setVisibility(ctx.state.container, ctx.state.public, '.r:*,.rlistings', event.target.checked, function(res){
              if(res && res.error !== undefined) {
                  console.log('failed to set visibility');
              }
              else {
                  ctx.setState({'website': value});
              }
          });
      };
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
    if(!this.state.dialog) {
         return null;
    }
    return (
        <Dialog
          title={this.state.container}
          modal={false}
          actions={actions}
          open={this.state.dialog}
          onRequestClose={this.handleDialogClose}
          autoScrollBodyContent={true}
        >
            <Card className="container">
                <CardHeader title={'Project: ' +this.project}></CardHeader>
                <CardText>
                <RaisedButton
                      label="Set public"
                      secondary={true}
                      keyboardFocused={true}
                      disabled={this.state.public}
                      onClick={this.setVisibility(true)}
                />
                <RaisedButton
                      label="Set private"
                      primary={true}
                      keyboardFocused={true}
                      disabled={!this.state.public}
                      onClick={this.setVisibility(false)}
                />
                <Checkbox
                    label="Enable website listing (needs public visibility)"
                    checked={this.state.website}
                    onCheck={this.handleWebsite()}
                />

                <GridList cellHeight={80}>
                    <GridTile>
                    <TextField
                        floatingLabelText="web hook"
                        name="web_hook"
                        value={this.state.web_hook}
                        onChange={this.updateHook()}
                        />
                    </GridTile>
                    <GridTile>
                    <TextField
                        floatingLabelText="web hook regexp"
                        name="hook_regexp"
                        value={this.state.hook_regexp}
                        onChange={this.updateHookRegexp()}
                        />
                        </GridTile>
                    </GridList>
                    <RaisedButton
                          label="Save"
                          primary={true}
                          keyboardFocused={true}
                          onClick={this.setHook()}
                    />
                    <GridList>
                        {this.state.metas.map((meta, index) =>(
                            <GridTile key={meta.name}>
                                <div className="field-line">
                                    <TextField
                                        floatingLabelText={meta.name}
                                        name={meta.name}
                                        value={meta.value}
                                        disabled={true}/>

                                </div>
                            </GridTile>
                        ))}
                    </GridList>
               </CardText>
            </Card>
        </Dialog>
    );
  }
}

export default ContainerInfo;
