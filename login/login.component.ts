import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  FormArray,
  Validators,
  FormControl,
  AbstractControl,
  ReactiveFormsModule,
  ValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { routerTransition } from '../router.animations';
import { UserApiService } from '../shared/services/user.service';
import { Login }    from './login';
import { catchError, tap, map, filter } from 'rxjs/operators';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    animations: [routerTransition()]
})
export class LoginComponent implements OnInit {
    constructor(
        private translate: TranslateService,
        public router: Router,
        private activatedRoute: ActivatedRoute,
        private fb: FormBuilder,
        private api: UserApiService,
        ) {
            this.translate.addLangs(['en', 'fr', 'ur', 'es', 'it', 'fa', 'de', 'zh-CHS']);
            this.translate.setDefaultLang('en');
            const browserLang = this.translate.getBrowserLang();
            this.translate.use(browserLang.match(/en|fr|ur|es|it|fa|de|zh-CHS/) ? browserLang : 'en');
            this.loginForm = this.fb.group({
                'email': new FormControl(
                    null,
                    Validators.compose([Validators.required, Validators.email])
                    ),
                'password': new FormControl(
                    null,
                    Validators.required
                    )
            })
    }
    googleAuthData: any = {};
    focus;
    focus1;
    state = 0;
    loginForm: FormGroup;
    model = new Login('', '');
    submitted = false;
    user = {};
    apiResponse: any = {};
    googleLoginResponse: any = {};
    mode = 'production';
    clientId = this.mode == "test" ? "794440247065-58tpr4o5crsk3bn1umj2c4tmftcrlr43.apps.googleusercontent.com" : "593495542894-03e9ktonpnr4g18f1q30jk1876envv53.apps.googleusercontent.com";
    clientSecret = this.mode == "test" ? "ZtW2smozBg9ZUzw9nGj8mgZU" : "WmKFzUCf7qfwQFvfUU8Hk9Bw";
    scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";
    redirect_uri = this.mode == "test" ? "http://localhost:4200/login" : "https://growfinance.app/login";
    home_router = 'dashboard';
    invalidAuth = false;
    async ngOnInit() {
        this.activatedRoute.queryParams
        .subscribe(params => {
            console.log(params); // {order: "popular"}
            if(params.error != undefined){
                var alert = {
                    "type" : "danger",
                    "message" : "User not exist. Please try again with correct details!"
                };
                this.apiResponse = alert;
                this.invalidAuth = true;
                return;
            }
        });
        if(localStorage.getItem('isLoggedin') == 'true'){
            if(confirm("You are already logged in. Are you sure you want to logout from previous session?")){
                localStorage.clear();
            }else{
                if(localStorage.getItem('googleLoggedin') == 'true'){
                    var oldAccessToken = localStorage.getItem('accessToken');
                    /* check if access token is not expired */
                    var isTokenValid = this.api.verifyIdToken(oldAccessToken)
                    .toPromise()
                    .then(res => {
                        console.log(res);
                        this.router.navigate([this.home_router]);
                    })
                    .catch(async (err) => {
                        console.log(err);
                        /* try to refresh token and update to database */
                        await this.refreshToken()
                        .then(response => {
                            localStorage.accessToken = this.googleAuthData.id_token;
                            this.router.navigate([this.home_router]);
                        })
                        .catch(err => {
                            this.googleLoginResponse = {
                                'type': 'danger',
                                'message': 'Session is expired! Please login again'
                            };
                        })
                        
                    });
                }else{
                    this.router.navigate([this.home_router]);
                }
            }
        }
        
        if(localStorage.getItem('isLoggedin') != 'true'){
            //get response token
            var hashURLPart = window.location.hash;
            if(hashURLPart == '') {
                hashURLPart = window.location.href.split('?')[1];
            }
            
            if(hashURLPart != '' && hashURLPart != undefined){
                //chek if error or user denied for permission
                hashURLPart = hashURLPart.replace('#','');
                var queryParams: any = this.getQueryParams(hashURLPart);

                if(queryParams.code == undefined){
                    return;
                }
                var cookie: any = document.cookie;
                var cookieObj: any = this.getCookieObject(cookie);
                this.googleAuthData = queryParams;
                
                var redirect_uri = "http://localhost:4200/login";
                await this.api.getAuthAccessToken({
                    'code':queryParams.code,
                    'client_id': this.clientId,
                    'client_secret': this.clientSecret,
                    'redirect_uri': this.redirect_uri,
                    'grant_type': 'authorization_code'
                })
                .toPromise()
                .then((authToken: any) => {
                    this.googleAuthData['access_token'] = authToken['access_token'];
                    this.googleAuthData['expires_in'] = authToken.expires_in;
                    this.googleAuthData['id_token'] = authToken.id_token;
                    this.googleAuthData['refresh_token'] = authToken.refresh_token;
                })
                .catch( async (err) => {
                    console.log(err);
                    this.googleLoginResponse = {
                        "type" : "danger",
                        "message" : "Please login again!"
                    };
                    return;
                })

                if(cookieObj.state == queryParams.state){
                    this.getGoogleUserProfileData();
                }
            }
        }
        
        
    }

    async refreshToken(){
        return new Promise(async (resolve, reject) => {
            /* get refresh token from oauth 2 api */
            await this.api.getAuthAccessToken({
                'client_id': this.clientId,
                'client_secret': this.clientSecret,
                'refresh_token': localStorage.getItem('refreshToken'),
                'grant_type': 'refresh_token'
            })
            .toPromise()
            .then(async (authToken: any) => {
                this.googleAuthData['access_token'] = authToken['access_token'];
                this.googleAuthData['id_token'] = authToken.id_token;
                /* update to database */
                await this.api.updateAccessToken({
                    'access_token': authToken.access_token,
                    'id_token': authToken.id_token
                })
                .toPromise()
                .then(res => {
                    console.log(res);
                    resolve();
                })
                .catch(err => {
                    console.log(err);
                    reject();
                })

            })
            .catch(err => {
                reject();
            })
        });
    }

    getQueryParams = (url) => {
        let queryParams = {};
        //search property returns the query string of url
        let queryStrings = url
        let params = queryStrings.split('&');
        for (var i = 0; i < params.length; i++) {
            var pair = params[i].split('=');
            queryParams[pair[0]] = decodeURIComponent(pair[1]);
        }
        return queryParams;
    };

    getCookieObject = (string) => {
        let cookies = {};
        let cookieString = string;
        let params = cookieString.split(';');
        for (var i = 0; i < params.length; i++) {
            var pair = params[i].split('=');
            cookies[pair[0].replace(' ','')] = decodeURIComponent(pair[1]).replace(' ','');
        }
        return cookies;
    };

    hasErrors(control){
        if(control.dirty || this.submitted){
            if(control.invalid){
                return true;
            }
        }
        return false;
    }


    async onLoggedin() {
        console.log(this.loginForm);
        this.submitted = true;
        if(this.loginForm.invalid){
            return false;
        }
        var data = {
            "Email": this.loginForm.controls['email'].value,
            "Password": this.loginForm.controls['password'].value
        }
        await this.validateLogin(data)
        .then(response => {
            console.log(response);
            var alert = {};

            if(response['status'] == true){
                response['data']['AccesslevelNumber'] = this.getAccesslevelNumber(response['data']['AccessLevel']);
                localStorage.clear();
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                alert = {
                    "type" : "success",
                    "message" : "Login Successfully. Redirecting..."
                };
                this.apiResponse = alert;
                localStorage.isLoggedin = true;
                localStorage.loggedinUser = JSON.stringify(response['data']);
                localStorage.accessToken = response['accessToken'];
                localStorage.refreshToken = response['refreshToken'];
                if (localStorage.getItem("loggedinUser") != null && localStorage.getItem("accessToken") != null && localStorage.getItem("refreshToken") != null && localStorage.getItem("isLoggedin") != null) {
                    setTimeout(() => {
                        // this.router.navigate(['deals']);
                        window.location.href = this.home_router;
                    }, 500);
                }
            }else{
                alert = {
                    "type" : "danger",
                    "message" : response['message']
                }; 
                this.googleLoginResponse = alert;
            }
        }, err => {
            var alert = {
                "type" : "danger",
                "message" : 'Internal Error'
            }; 
            this.googleLoginResponse = alert;
        })
    }

    validateLogin(data){
        return new Promise((resolve, reject) => {
            this.api.validateLogin(data)
            .subscribe (res => {
                resolve(res);
            });
        })
    }

    get f(){ return this.loginForm.controls }

    onGoogleLogin(){
        var date = new Date();
        var state = date.getTime();
        document.cookie = `state=${state}`;
        window.location.href = 
        `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=${this.scope}&include_granted_scopes=true&state=${state}&redirect_uri=${this.redirect_uri}&response_type=code&client_id=${this.clientId}&prompt=consent`;
    }

    async getGoogleUserProfileData(){
        var alert = {};
        var accessToken = this.googleAuthData.access_token;
        await this.api.getGoogleUserProfile(accessToken)
        .toPromise()
        .then(async (profile) => {
            // check if user exist in / registered in grow database
            // Either using google or using email address
            await this.api.isUserRegisteredWithGoogle({'googleId': profile.id, 'email': profile.email})
            .toPromise()
            .then(async (user: [any]) => {
                // If yes then get access token
                if(user.length > 0){
                    // user is registered
                    if(user[0].ExternalId != null && user[0].ExternalId != ''){
                        this.loginAndRedirect(user[0]);
                    }else{
                        this.storeLoginData({
                            googleLoggedin : true,
                            loggedinUser : JSON.stringify(user[0]),
                            accessToken : this.googleAuthData.id_token, //jwt token as access token
                            refreshToken : this.googleAuthData.refresh_token,
                        });
                        //user is registred via grow password system so update googleId here
                        await this.api.updateGoogleLoginData(user[0].UserId, {
                            UserId: user[0].UserId,
                            ExternalId: profile.id,
                            ExternalAccessToken: this.googleAuthData.access_token,
                            ExternalRefreshToken: this.googleAuthData.refresh_token,
                            ExternalProvider: 'Google',
                            GivenName: profile.given_name,
                            FamilyName: profile.family_name
                        })
                        .toPromise()
                        .then(udpatedUser => {
                            console.log(udpatedUser);
                            this.loginAndRedirect(udpatedUser[0]);

                        }).catch(updateError => {
                            console.log(updateError);
                        })
                    }
                }else{
                    // If no then register new user to grow database
                    // register user in grow database
                    profile.access_token = this.googleAuthData.access_token;
                    profile.refresh_token  = this.googleAuthData.refresh_token;
                    profile.id_token = this.googleAuthData.id_token;
                    localStorage.setItem('accessToken',profile.id_token )
                    localStorage.setItem("google_profile",JSON.stringify(profile));
                    this.router.navigateByUrl('/signup')
                    // this.registerNewGoogleUser(profile)
                    // .then(async (newUser: any) => {
                    //     await this.api.getUser(newUser.UserId)
                    //     .toPromise()
                    //     .then(newUserDetails => {
                    //         this.loginAndRedirect(newUserDetails[0]);
                    //     })
                    // });
                }
            })
            .catch(error => {
                console.error(error);
                var alert = {
                    "type" : "danger",
                    "message" : 'Internal Error'
                };
                this.googleLoginResponse = alert;
            })
        })
        .catch(err => {
            console.log(err);
            var alert = {
                "type" : "danger",
                "message" : 'Internal Error'
            }; 
            this.googleLoginResponse = alert;
        })
    }

    async registerNewGoogleUser(googleProfile){
        return new Promise(async (resolve, reject) => {
            var accessToken = this.googleAuthData.access_token;
            var userData: any = {};
            // userData.Username = googleProfile.email;
            userData.AccessLevel = 'externalbroker';
            userData.GivenName = googleProfile.given_name;
            userData.FamilyName = googleProfile.family_name;
            userData.Name = googleProfile.name;
            userData.Email = googleProfile.email;
            userData.ExternalId = googleProfile.id;
            userData.verified=1;
            userData.ExternalAccessToken = accessToken;
            userData.ExternalRefreshToken = this.googleAuthData.refresh_token;
            userData.ExternalProvider = 'Google';
            //this will create new user as External broker in database
            //userData.AccessLevel will override with exBroker in API
            await this.api.createExternalBroker(userData)
            .toPromise()
            .then(user => {
                console.log(user);
                resolve(user);
            })
            .catch(err => {
                reject(err);
            })
        })
    }

    loginAndRedirect(response){
        this.submitted = true; 
        var alert = {};
        var loginData: any = {};
        this.clearLoignData();
        alert = {
            "type" : "success",
            "message" : "Login Successfully. Redirecting..."
        };
        this.googleLoginResponse = alert;
        loginData.isLoggedin = true;

        response['AccesslevelNumber'] = this.getAccesslevelNumber(response['AccessLevel']);
        loginData.googleLoggedin = true;
        loginData.loggedinUser = JSON.stringify(response);
        loginData.accessToken = this.googleAuthData.id_token; //jwt token as access token
        loginData.refreshToken = response['ExternalRefreshToken'];
        
        this.storeLoginData(loginData);
        this.redirectToHome();
    }

    storeLoginData(data: object){
        for (var property in data) {
          if (data.hasOwnProperty(property)) {
            localStorage.setItem(property, data[property]);
          }
        }
    }

    clearLoignData(){
        localStorage.clear();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }

    redirectToHome(){
        if (localStorage.getItem("loggedinUser") != null && localStorage.getItem("accessToken") != null && localStorage.getItem("refreshToken") != null && localStorage.getItem("isLoggedin") != null) {
            setTimeout(() => {
                window.location.href = this.home_router;
            }, 500);
        }
    }

    getAccesslevelNumber(accessLevelString){
        /* considering default accesslevel to 4 = customer */
        var accessLevelNumber = 4;
        switch (accessLevelString) {
            case "admin":
                accessLevelNumber = 0;
                break;

            case "analyst":
                accessLevelNumber = 1;
                break;

            case "internalbroker":
                accessLevelNumber = 2;
                break;

            case "externalbroker":
                accessLevelNumber = 3;
                break;

            case "customer":
                accessLevelNumber = 4;
                break;

            case "companyadmin":
                accessLevelNumber = 5;
                break;

            case "it":
                accessLevelNumber = 6;
                break;
            
            default:
                accessLevelNumber = 4;
                break;
        }
        return accessLevelNumber;
    }

}
