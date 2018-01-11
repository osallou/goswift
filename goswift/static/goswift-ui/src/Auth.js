import $ from 'jquery';

export class Auth {
    static login(logdata, callback){
        $.ajax({
            url: "http://localhost:6543/api/v1/auth",
            type: "POST",
            data:  JSON.stringify(logdata),
            contentType: "application/json",
            dataType: "json",
            success: function(res){
                localStorage.setItem('goswift-token', res.token);
                localStorage.setItem('goswift-project', res.project);
                callback({'status': true});
            },
            error: function(jqXHR, textStatus, error){
                callback({'status': false, 'msg': error});
            }

        });
    }
}


//export default Auth;
