import React, { Component } from 'react';
// import num from 'pretty-bytes';
import { Card, CardText, CardHeader } from 'material-ui/Card';
import Dialog from 'material-ui/Dialog';
import { Container } from './Container';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import { GridList, GridTile } from 'material-ui/GridList';


class ContainerInfo extends Component {
    constructor(props) {
          super(props);
          this.state = {
              'container': props.container,
              'metas': [],
              'dialog': props.dialog || false,
              'onClose': props.onClose
          }
          this.handleDialogClose = this.handleDialogClose.bind(this);
          this.handleDialogSave = this.handleDialogSave.bind(this);
      };
      componentDidMount(){
          // get container object details
          var ctx = this;
          if(this.state.container){
              Container.getContainerMeta(this.state.container, function(res){
                  ctx.setState({'metas': res});
              });
          }
      };

      componentWillReceiveProps(nextProps){
        var ctx = this;
        if(nextProps.dialog && nextProps.file !== undefined && nextProps.file!=null){
            Container.getContainerMeta(nextProps.file, function(res){
                console.log('container metas', res)
                ctx.setState({
                    'container': nextProps.file,
                    'dialog': nextProps.dialog,
                    'metas': res,
                });
            });
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
                <CardHeader title="Information"></CardHeader>
                <CardText>
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
