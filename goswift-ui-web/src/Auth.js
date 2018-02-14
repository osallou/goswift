import $ from 'jquery';
import Config from './Config';

export class Auth {
    static logout(){
        localStorage.removeItem('goswift-token');
        localStorage.removeItem('goswift-project');
        localStorage.removeItem('goswift-admin');
    }
    static reauth(){
        console.log('update token');
        if(!localStorage.getItem('goswift-token') || !localStorage.getItem('goswift-project')){
            return;
        }
        var config = Config.getConfig();
        $.ajax({
            url: config.url + "/api/v1/reauth/" + localStorage.getItem('goswift-project'),
            beforeSend: function(xhr){xhr.setRequestHeader('X-Auth-Token', localStorage.getItem('goswift-token'));},
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            cache: false,
            success: function(res, textStatus, request){
                localStorage.setItem('goswift-token', res.token);
                localStorage.setItem('goswift-project', res.project);
                Auth.setQuotas();
            },
            error: function(jqXHR, textStatus, error){
                console.log('failed to reauth', error);
            }

        });
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
                localStorage.setItem('goswift-admin', res.is_admin);
                callback({'status': true});
            },
            error: function(jqXHR, textStatus, error){
                console.log('login error:', error);
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
    static isAdmin(){
        var token = localStorage.getItem('goswift-admin');
        console.log('isAdmin', token);
        if(token === undefined || token === null || token === 'false' || token === false){
            return false;
        }
        else{
            return true;
        }
    }
    static getAuthData(){
        return {'is_admin': localStorage.getItem('goswift-admin'), 'token': localStorage.getItem('goswift-token'), 'project': localStorage.getItem('goswift-project')};
    }
}
