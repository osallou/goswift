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

class ContainerInfo extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'container': props.container,
              'metas': [],
              'dialog': props.dialog || false,
              'onClose': props.onClose,
              'web_hook': ''
          }
          this.project = Auth.getAuthData().project;
          this.handleDialogClose = this.handleDialogClose.bind(this);
          this.handleDialogSave = this.handleDialogSave.bind(this);
          this.setHook = this.setHook.bind(this);
          this.updateHook = this.updateHook.bind(this);
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
                  ctx.setState('metas': res);
              });
              Container.getContainerHook(this.state.container, function(res){
                  if(res.error !== undefined) {
                      ctx.setState({'web_hook': ''});
                      console.log('failed to get container hook', res);
                      return;
                  }
                  if(res.hook){
                      ctx.setState({'web_hook': res.hook});
                  }
                  else{
                      ctx.setState({'web_hook': ''});
                  }
              });
          }
      };

      componentWillReceiveProps(nextProps){
        var ctx = this;
        if(nextProps.dialog && nextProps.file !== undefined && nextProps.file!=null){
            Container.getContainerMeta(nextProps.file, function(res){
                // console.log('container metas', res);
                if(res.error === undefined){
                    ctx.setState({
                        'container': nextProps.file,
                        'dialog': nextProps.dialog,
                        'metas': res
                    });
                    // console.log('set metas',res,nextProps.dialog);
                }
            });
            Container.getContainerHook(this.state.container, function(res){
                if(res.error !== undefined) {
                    ctx.setState({'web_hook': ''});
                    console.log('failed to get container hook', res);
                    return;
                }
                if(res.hook){
                    ctx.setState({'web_hook': res.hook});
                }
                else {
                    ctx.setState({'web_hook': ''});
                }
            });
        }
      }
  setHook(){
        var ctx = this;
        return function(){
              Container.setContainerHook(ctx.state.container, ctx.state.web_hook, function(res){
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
        >
            <Card className="container">
                <CardHeader title="Information">Project {this.project}</CardHeader>
                <CardText>
                    <TextField
                        floatingLabelText="web hook"
                        name="web_hook"
                        value={this.state.web_hook}
                        onChange={this.updateHook()}
                        />
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
