import $ from 'jquery';
import Config from './Config';

export class Auth {
    static setQuotas(){
        console.log('should send X-Container-Meta-Quota-Bytes header');
    }
    static logout(){
        localStorage.removeItem('goswift-token');
        localStorage.removeItem('goswift-project');
    }
    static login(logdata, callback){
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/auth",
            type: "POST",
            data:  JSON.stringify(logdata),
            contentType: "application/json",
            dataType: "json",
            success: function(res, textStatus, request){
                localStorage.setItem('goswift-token', res.token);
                localStorage.setItem('goswift-project', res.project);
                Auth.setQuotas();
                callback({'status': true});
            },
            error: function(jqXHR, textStatus, error){
                callback({'status': false, 'msg': error});
            }

        });
    }
    static isAuthenticated(){
        var token = localStorage.getItem('goswift-token');
        if(token === undefined || token === null){
            // console.log('not authenticated');
            return false;
        }
        else{
            // console.log('authenticated:' + token);
            return true;
        }
    }
    static getAuthData(){
        return {'token': localStorage.getItem('goswift-token'), 'project': localStorage.getItem('goswift-project')};
    }
}


//export default Auth;
