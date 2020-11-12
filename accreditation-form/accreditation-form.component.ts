import { HostListener, TemplateRef, ViewChild, Component, OnInit, EventEmitter, ChangeDetectorRef, ViewChildren, QueryList, Pipe, ElementRef } from '@angular/core';
import moment from 'moment';
import { ActivatedRoute } from '@angular/router';

import { Subscription, Observable, merge, Subject, of, BehaviorSubject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, delay, map, tap, switchMap, filter, skip, takeUntil, defaultIfEmpty } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MapsAPILoader, AgmMap } from '@agm/core';
import {
	NgbModal, NgbDate, ModalDismissReasons, NgbActiveModal, NgbCalendar, NgbModalRef, NgbDateParserFormatter, NgbDateStruct,
	NgbTooltipConfig
} from '@ng-bootstrap/ng-bootstrap';
import Rolldate from 'rolldate';
//services
import { DeviceDetectorService } from 'ngx-device-detector';
import { EquifixApiService } from './../shared/services/equifix.service';
import { AccreditationFormService } from './../shared/services/accreditation-form.service';
import { NgxSpinnerService } from "ngx-spinner";
import * as GlobalConst from './../../../const.config';

//form
import {
	FormBuilder,
	FormGroup,
	FormArray,
	Validators,
	FormControl,
	ValidationErrors,
	AbstractControl,
	ReactiveFormsModule,
	ValidatorFn
} from '@angular/forms';
// custom validators
import { validateABN } from './../validators/abn.validator';
import { validateACN } from './../validators/acn.validator';
import { NgSelectComponent } from '@ng-select/ng-select';
import { TitleCasePipe } from '@angular/common';
import { NgxImageCompressService } from 'ngx-image-compress';
import { CompressorService } from './../shared/services/compressor.service';

declare var google: any;

@Pipe({name: 'titleCase'})

@Component({
	selector: 'app-accreditation-form',
	templateUrl: './accreditation-form.component.html',
	styleUrls: ['./accreditation-form.component.scss', './../layout/layout.component.scss']
})
export class AccreditationFormComponent implements OnInit {
	@ViewChildren(NgSelectComponent) selects: QueryList<NgSelectComponent>
	@ViewChild('confirmDetailsModal') confirmDetailsModal: TemplateRef<any>;
	confirmDetailsModalRef: any;
	pageData: any = {};
	applicantNumber: string;
	isDesktopDevice = false;
	public isCollapsed = true;
	validateStep1: boolean = false;
	rolldtLang = {
		title: 'Choose date',
		cancel: 'Cancel',
		confirm: 'Select',
		year: '',
		month: '',
		day: '',
		hour: '',
		min: '',
		sec: ''
	};
	mobilenumberMask = [0, 4, /[0-9]/, /[0-9]/, ' ', /\d/, /\d/, /\d/, ' ', /\d/, /\d/, /\d/];
	collapedSideBar: boolean;
	typeaheadOrgList = new EventEmitter<string>();
	typeaheadAggregatorList = new EventEmitter<string>();
	orgList: any = [];
	aggregatorList: any =[];
	searchingOrgList: boolean = false;
	searchingAggList: boolean = false;
	currentStep:number =1;
	totalSteps:number=5;
	accreditationForm: FormGroup;
	confirmationForm: FormGroup;
	minDate: Date;
  	maxDate: Date
	DOBMaxDate = { year: parseInt(moment().format('YYYY')), month: parseInt(moment().format('MM')), day: parseInt(moment().format('DD')) };
	DLEMinDate = { year: (parseInt(moment().format('YYYY')) - 5), month: parseInt(moment().format('MM')), day: parseInt(moment().format('DD')) };
	drLicenceStateList = [
		"ACT",
		"NSW",
		"NT",
		"QLD",
		"SA",
		"TAS",
		"VIC",
		"WA"
	];
	bsDateConfiguration: any = {
		isAnimated: true,
		dateInputFormat: 'DD/MM/YYYY'
	};
	geocoder: any;
	autocompleteService: any;
	autoCompletePrefix: string = '';
	typeaheadAddress = new EventEmitter<string>();
	addressList:any = [];
	searchingPlaces: boolean = false;
	bas64_string: any = '';
	formAlert: any = [];
	proceedingDriverLicence: boolean = false;
	driverLicenceApiError: boolean = false;
	formSubmitted: boolean = false;
	searchingAggregator : boolean = false;
	isMobileResolution: boolean;
	entityType: string[];
	salesForceIdExists:boolean = false;
	companySfId:any='';
    aggregatorSfId:any='';
	formControlSizeClass: any = 'col-md-12 ';
	progressbarValue = 0;
	@HostListener("window:resize", ["$event"])
	isMobile(event) {
		if (window.innerWidth < 1200) {
			this.isMobileResolution = true;
		} else {
			this.isMobileResolution = false;
		}
	}


	constructor(
		private equifaxService: EquifixApiService,
		private accreformService: AccreditationFormService,
		private cd: ChangeDetectorRef,
		private fb: FormBuilder,
		private translate: TranslateService,
		private deviceService: DeviceDetectorService,
		public mapsApiLoader: MapsAPILoader,
		private titleCase: TitleCasePipe,
		private elementRef: ElementRef,
		private spinner: NgxSpinnerService,
		private modalService: NgbModal,
		private activeRoute: ActivatedRoute,
		private imageCompress: NgxImageCompressService,
		private compressService: CompressorService
	) {
		this.translate.addLangs(['en', 'fr', 'ur', 'es', 'it', 'fa', 'de', 'zh-CHS']);
		this.translate.setDefaultLang('en');
		const browserLang = this.translate.getBrowserLang();
		
		this.translate.use(browserLang.match(/en|fr|ur|es|it|fa|de|zh-CHS/) ? browserLang : 'en');

		this.activeRoute.data.subscribe(v => {
	      this.pageData = v;
	    });
		this.mapsApiLoader = mapsApiLoader;
	    this.mapsApiLoader.load().then(() => {
	      this.geocoder = new google.maps.Geocoder();
	      this.autocompleteService = new google.maps.places.AutocompleteService();
	    });

	    if (window.innerWidth < 1200) {
	      this.isMobileResolution = true;
	    } else {
	      this.isMobileResolution = false;
	    }

	    this.typeaheadAddress
        .pipe(
            debounceTime(1000),
            distinctUntilChanged(),
            tap((term) => {
              if(term != null){
                  if(term.length > 6){
                      this.searchingPlaces = true;
                  }else{
                      return of([]);
                  }
              }
            }),
            switchMap(term => this.getplacelist(term)),
            tap(() => {
              this.searchingPlaces = false;
            })
        )
        .subscribe(items => {
	        this.addressList =items;
        	this.searchingPlaces = false;
            this.cd.markForCheck();
        }, (err) => {
            console.log('error', err);
            this.addressList = [];
            this.searchingPlaces = false;
            this.cd.markForCheck();
		});
		
		this.typeaheadAggregatorList.pipe(
			debounceTime(1000),
			distinctUntilChanged(),
			tap((term)=>{
				if(term != null){
					if(term.length>6){
						this.searchingAggregator = true;
					}else{
						return of([])
					}
				}
			}),
			switchMap(term => this.getAggregatorSearch(term)),
			tap(()=>{
				this.searchingAggregator = false;
			})
		)
		.subscribe(items=>{
			this.aggregatorList = items
		});

		this.typeaheadOrgList
			.pipe(
				debounceTime(1000),
				distinctUntilChanged(),
				tap((term) => {
					if (term != null) {
						if (term.length > 6) {
							this.searchingOrgList = true;
						} else {
							return of([]);
						}
					}
				}),
				switchMap(term => this.getOrganisationSearchresult_ABR(term)),
				tap(() => {
					this.searchingOrgList = false;
				})
			)
			.subscribe(items => {
				this.orgList = items;
				// decode special characters using javascript
				setTimeout(() => {
					this.formatSpecialCharacterByJs();
				}, 200);
				this.cd.markForCheck();
			}, (err) => {
				console.log('error', err);
				this.orgList = [];
				this.cd.markForCheck();
			});

			this.isDesktopDevice = this.deviceService.isDesktop();
			this.minDate = new Date('01-01-1900');
			this.maxDate = new Date();
	}

	getEntityType(){
		return GlobalConst.entityType;
    }
	
	ngOnInit() {

		this.createFormControl();
		this.entityType = this.getEntityType();
		setTimeout(() => {
			// this.accreditationForm.controls['driverLicence'].markAsDirty();
			// this.accreditationForm.controls['driverLicence'].markAsTouched();
			// this.accreditationForm.controls['driverLicence'].setErrors({'incorrect' : true});
			this.accreditationForm.updateValueAndValidity();
		}, 100);
		const orgInput = document.querySelector('[formcontrolname="companyName"]');
	}

	ngAfterViewInit() {
		// console.log(this.selects.filterInput as nativeElement);
    	this.selects.forEach((selectInstance: any) => {
    		if(selectInstance.selectedItemId == 0){
    			(selectInstance as NgSelectComponent).focus();
    		}
    	});
  	}

	/*
		Identify sidebar collapsed or not
	*/
	receiveCollapsed($event) {
		this.collapedSideBar = $event;
	}

	/* 
		ng-select encode issue fix 
		find and replace "&amp;" with "&"
	*/
	formatSpecialCharacterByJs(){
		var elements = document.querySelectorAll('.ng-option .ng-option-label');
		
		for (var i = 0; i < elements.length; i++) { 
			(elements[i] as HTMLElement).innerText = this.replaceSpecialCharacters((elements[i] as HTMLElement).innerText);
		}
	}

	/* replace speacial character from any given text */
	replaceSpecialCharacters(query){
		var formattedString = query.replace(/&apos;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&gt;/g, '>')
				.replace(/&lt;/g, '<')
				.replace(/&amp;/g, '&');
		return formattedString;
	}

	/* Initializing form and form controls */
	createFormControl() {
		this.accreditationForm = this.fb.group({
			companyName: [null, Validators.required],
			natureofBusiness: [null, Validators.required],
			entityType:[null,Validators.required],
			abn: [null, 
				Validators.compose([Validators.required, Validators.pattern('^[0-9 ]*$')]),
				Validators.composeAsync([validateABN])
				],
			entityName: [null,Validators.required],
			acn: [null,Validators.required,Validators.composeAsync([validateACN])],
			businessAddress: this.createAddressField(null, true),
			residentialAddress: this.createAddressField(null, true),
			heldAccreditationBefore: [false, Validators.required],
			// 'growbizAccreditationId': new FormControl(null, Validators.required), // added conditionally if held Accreditation Before
			ispartOfgroupOrAggregator: [false, Validators.required],
			// 'groupOrAggregatorName': new FormControl(),
			officeNumber: [null, Validators.required],
			title: [null, Validators.required],
			givenName: [null, Validators.required],
			middlename: [],
			surName: [null, Validators.required],
			preferredName: [],
			hasAnotherName: [false, Validators.required],
			//otherNames: [], // add only if hasAnotherName = yes
			dob: [null, Validators.required],
			hasAustralianCreditLicence: [false, Validators.required],
			// australianCreditLicenceNumber: [], // when hasAustralianCreditLicenec = yes
			// dirORemployeeOfLicenceEntity: [], // when hasAustralianCreditLicenec = yes
			// hasACRN: [], // when hasAustralianCreditLicenec = no
			// acrn: [], // when hasACRN = yes,
			mobileNumber: [null, Validators.required],
			email: [null, Validators.compose([Validators.required, Validators.email])],
			driverLicence: [null, Validators.required],
			driverLicenceNumber: [null, Validators.required],
			driverLicenceExpiryDate: [null, Validators.required],
			driverLicenceIssuingState: [null, Validators.required],
			declaredBankrupt: [false, Validators.required],
			refusedAccreditation: [false, Validators.required],
			convictedOfFraud: [false, Validators.required],
			// convictedOfFraudDetails: [], // when convictedOfFraud = yes
		},
		{
			updateOn: "blur"
		}
		)

		this.formControlsChangeEvents();

		//confirmation form
		this.confirmationForm = this.fb.group({
			givenName: [null, Validators.required],
			middlename: [],
			surName: [null, Validators.required],
			dob: [null, Validators.required],
			residentialAddress: this.createAddressField()
		})
	}

	/* return new address form group */
	createAddressField(data?, isRequired = false): FormGroup{
		var group: FormGroup =  this.fb.group({
		  'RawAddress': new FormControl(
		    data != null && ("RawAddress" in data) ? data.RawAddress: null
		  ),
		  'Postcode': new FormControl(
		    data != null && ("Postcode" in data) ? data.Postcode: null,
		  ),
		  'UnitNumber': new FormControl(null),
		  'StreetNumber': new FormControl(null),
		  'StreetName': new FormControl(null),
		  'StreetType': new FormControl(null),
		  'Suburb': new FormControl(null),
		  'State': new FormControl(null),
		  'Country': new FormControl(null),
		  'Latitude': new FormControl(null),
		  'Longitude': new FormControl(null),
		  'IsManualInput': new FormControl(false)
		});
		if(isRequired == true){
		  group.get('RawAddress').setValidators([Validators.required]);
		  group.get('Suburb').setValidators([Validators.required]);
		  group.get('State').setValidators([Validators.required]);
		  group.get('Postcode').setValidators([Validators.required]);
		}
		//data = this.accreditationForm.getRawValue()
		//console.log(data.residentialAddress)
		return group;
	}

	/* check if given control is invalid */
	isControlInvalid(control){
		if((control.errors != null && this.formSubmitted) || (control.dirty && control.errors != null)){
			return true;
		  }else{
			return false;
		  }
		//return control.invalid && (control.dirty || control.touched || this.formSubmitted);
	}

	handleFileUpload(e, control: AbstractControl){
		//reset all flags and errors
		this.driverLicenceApiError = false;
		this.proceedingDriverLicence = true;
		this.spinner.show();
		control.setErrors(null);
		var file = e.target.files[0];
		const reader = new FileReader();
		const fileName = e.target.files[0]['name'];
		reader.readAsDataURL(e.target.files[0]);
		reader.onload = async (ev) => {

			this.bas64_string = (ev.target as FileReader).result;
			await this.resizeCompressFile(this.bas64_string); //resize and compress image
         	var data = this.bas64_string.split(',')[1];
         	// control.setValue(this.bas64_string);
			this.accreformService.getDriverLicenceDetails(data)
			.toPromise()
			.then(async (res)=> {
				this.spinner.hide();
				if(res.Error != undefined){
					setTimeout(() => {
						control.markAsDirty();
						control.markAsTouched();
						control.setErrors({'invalidImage' : true});
						this.accreditationForm.updateValueAndValidity();
					}, 100);
					this.proceedingDriverLicence = false;
					this.spinner.hide();
					this.resetDriverLicenceFields();
					return;
				}else{
					control.setErrors(null);
				}
			  	var extension = '*';
			  	var stringFirstChar = (res.Image as string).charAt(0);
			  	switch (stringFirstChar) {
				  	case "/":
				  		extension = 'jpg';
				  		break;
				  	case "i":
				  		extension = 'png';
				  		break;
				  	case "R":
				  		extension = 'gif';
				  		break;
				  	case "U":
				  		extension = 'webp';
				  		break;
				  	default:
				  		extension = '*';
				  		break;
			  	}
			  	var cropedImage = 'data:image/'+extension+';base64,' + res.Image;
		        control.setValue(cropedImage);
		        await this.getFormattedAddress(res.Address).then((address: any) => {
		        	address.Postcode=address.PostCode;
		        	address.State=address.Region;
		        	address.Suburb=address.SuburbTown;
			        this.accreditationForm.patchValue({
			        	'driverLicenceNumber': res.License_No,
			        	'driverLicenceIssuingState': res.State,
			        	'residentialAddress': address,
			        	'dob': this.getFormattedDate(res.DOB),
			        	'driverLicenceExpiryDate': this.getFormattedDate(res.Expiry_Date),
			        	'givenName':res.Firstname,
			        	'middlename': res.Middlename,
			        	'surName':res.Surname
			        });
			        this.proceedingDriverLicence = false;
			        this.confirmationForm.patchValue(this.accreditationForm.getRawValue());
			        this.openConfirmationModal();
			    })
			})
			.catch(err => {
				control.reset();
				this.spinner.hide();
				this.driverLicenceApiError = true;
				this.proceedingDriverLicence = false;
				this.resetDriverLicenceFields();
			});
	    }
	}

	async resizeCompressFile(imageBase64){
		if(this.imageCompress.byteCount(imageBase64) > 500000){
			await this.compressFile(this.bas64_string).then(res => {
				this.bas64_string = res; //assign compress image and then proceed on that further
			}).catch(err => {
				console.error(err);
			});
		}
		await this.compressService.resizeImage(this.bas64_string).toPromise().then(async (url) => {
			this.bas64_string = url;
		})
		
	}

	compressFile(image): any {
		return new Promise(async (resolve, reject) => {
			var orientation = -1;
			if(this.imageCompress.byteCount(image) > 500000){
			  	await this.imageCompress
			  	.compressFile(image, orientation, 80, 80).then(
			    	result => {
			    		resolve(result);
			    	}
			  	).catch(err => {
			  		reject();
			  	});
			  }else{
			  	resolve(image);
			  }
	  	})
	}

	async getFormattedAddress(address){
		return new Promise((resolve, reject) => {
			this.getplacelist(address).subscribe(async (res: any) => {
				//res = array of items
				//get first maching address and pass to get more location details
				if(res.length > 0){
					await this.getLocationDetails(res[0].description)
					.then((addObject: any) => {
						addObject.prefix = res[0].prefix;
						var addressFieldValues = this.getAddressArrayFromComponent(addObject);
						resolve(addressFieldValues)
					})
					.catch(err => {
						resolve(null);
					});
				}
			}, err => {
				resolve(null);
			});
		})
		
	}

	resetDriverLicenceFields(){
		this.accreditationForm.patchValue({
			'driverLicence': null,
        	'driverLicenceNumber': '',
        	'residentialAddress': '',
        	'dob': '',
        	'driverLicenceExpiryDate': '',
        	'givenName':'',
        	'middlename': '',
        	'surName':'',
        	'driverLicenceIssuingState': ''
        });
	}

	openConfirmationModal(){
		this.confirmDetailsModalRef = this.modalService.open(
	        this.confirmDetailsModal);
	      this.confirmDetailsModalRef.result.then(async (result) => {

	      }, (reason) => {
	        return;
	      });
	}

	confirmDetails(){
		var confirmedValue = this.confirmationForm.getRawValue();
		this.accreditationForm.patchValue(confirmedValue);
		this.accreditationForm.updateValueAndValidity();
		this.confirmDetailsModalRef.close();
	}


	/* format date from "04Apr2023" to "04-04-2023" */
	getFormattedDate(date: string){
		var monthString = date.substring(2, date.length - 4);
		var monthNumber = moment().month(monthString).format("M");
		var day = date.substr(0, 2);
		var year = date.substr(date.length - 4, 4);
		return day + "/" + monthNumber + "/" + year;
	}

	/* 
		Initializa all form control change events
	*/
	formControlsChangeEvents() {
		this.accreditationForm.get('hasAnotherName')
		.valueChanges.subscribe(value => {
			//add other names field control
			if(value == true){
				this.accreditationForm.addControl(
					'otherNames',
					new FormControl(null, Validators.required)
					);
			}else{
				this.accreditationForm.removeControl('otherNames');
			}
			this.accreditationForm.updateValueAndValidity();
		})

		this.accreditationForm.get('heldAccreditationBefore')
			.valueChanges.subscribe(value => {
				// added conditionally if held Accreditation Before
				if (value === true) {
					this.accreditationForm.addControl(
						'growbizAccreditationId',
						new FormControl(null, Validators.required)
					)
				} else {
					this.accreditationForm.removeControl('growbizAccreditationId');
				}
				this.accreditationForm.updateValueAndValidity();
			})

		this.accreditationForm.get('ispartOfgroupOrAggregator')
			.valueChanges.subscribe(value => {
				// added groupOrAggregatorName field if is part of group or aggregator
				if (value === true) {
					this.accreditationForm.addControl(
						'groupOrAggregatorName',
						new FormControl(null, Validators.required)
					)
				} else {
					this.accreditationForm.removeControl('groupOrAggregatorName');
				}
				this.accreditationForm.updateValueAndValidity();
			})

		this.accreditationForm.get('hasAustralianCreditLicence')
			.valueChanges.subscribe(value => {
				// added groupOrAggregatorName field if is part of group or aggregator
				if (value === true) {
					this.accreditationForm.addControl(
						'australianCreditLicenceNumber',
						new FormControl(null, Validators.required)
					)
					this.accreditationForm.addControl(
						'dirORemployeeOfLicenceEntity',
						new FormControl(null, Validators.required)
					)
					this.accreditationForm.removeControl('hasACRN');
					this.accreditationForm.removeControl('ACRN');
				} else {
					this.accreditationForm.removeControl('australianCreditLicenceNumber');
					this.accreditationForm.removeControl('dirORemployeeOfLicenceEntity');
					this.accreditationForm.addControl(
						'hasACRN',
						new FormControl(false, Validators.required)
					)
					//add change events for this control
					this.accreditationForm.get('hasACRN')
						.valueChanges.subscribe(value => {
							if (value === true) {
								this.accreditationForm.addControl(
									'ACRN',
									new FormControl(null, Validators.required)
								)
							} else {
								this.accreditationForm.removeControl('ACRN');
							}
						});

				}
				this.accreditationForm.updateValueAndValidity();
			})


		this.accreditationForm.get('convictedOfFraud')
		.valueChanges.subscribe(value => {
			if(value == true){
				this.accreditationForm.addControl(
					'convictedOfFraudDetails',
					new FormControl(null, Validators.required)
				)	
			}else{
				this.accreditationForm.removeControl('convictedOfFraudDetails');
			}
			
		})


	}

	onSelectAggregatorSearchItem(data, control){
	 console.log(data,control);
	 //alert("called")
	 this.aggregatorSfId = data.SalesforceId;
	 this.accreditationForm.get('groupOrAggregatorName').setValue(data.EntityName)
	}
	
	/* fill in related fields fetched after company search and selection */
	onSelectEntityOrgSearchItem(data, control) {
		//alert(data)
		var abn: number = null;
		var acn: number = null;
		if(data['abn'] != undefined){
			abn = data.abn
		}
		this.accreditationForm.get('abn').setValue(abn);
		this.accreditationForm.get('entityName').setValue(this.formatter(data));
        this.checkABNinDB()
		// set formatted value to org name
		control.setValue(this.formatter(data));
	}

	checkABNinDB(){
		var ABN = this.accreditationForm.value.abn;
		this.equifaxService.checkABNinDatabase(ABN).subscribe(res=>{
			console.log(res);
			if(res.length){
			 this.salesForceIdExists = true;
			 this.companySfId = res[0]
			}else{
				this.salesForceIdExists = false;
			}
			console.log(this.salesForceIdExists)
		})
	}

	/* Format special characters from name of org search drop down list */
	formatter = (x: any) => {
		if (x != 'keep typing' && x['organisationName'] != undefined) {
			var formattedText = x['organisationName'].replace(/&apos;/g, "'")
				.replace(/&quot;/g, '"')
				.replace(/&gt;/g, '>')
				.replace(/&lt;/g, '<')
				.replace(/&amp;/g, '&');
		} else {
			return;
		}
		return formattedText;
	};

	/*
		used for ng-select customization
		to display Keep Typing... text
	*/
	getDisabled(item) {
		if (item.description == 'keeptyping') {
			return true;
		} else {
			return false;
		}
	}

	/*
		Search organisation by name using third party API veda score
	*/
	getOrganisationSearchresult(term: string): Observable<any[]> {
		if (term == null) {
			return of([]);
		}
		if (term.length > 6) {
			var temp: Observable<any>;
			temp = new Observable(observer => {
				return this.equifaxService.equifaxSerachOrganisationByName(term)
					.toPromise()
					.then(item => {
						observer.next(item);
						this.orgList = item;

					})
					.catch(err => {
						observer.next([]);
						this.orgList = [];
					})

			});
			return temp;
		} else {
			this.orgList = [{ description: 'keeptyping' }];
			return of([{ description: 'keeptyping' }]);
		}
	}

	/*
		Search organisation by name using third party API http://abr.business.gov.au/
	*/
	getOrganisationSearchresult_ABR(term: string): Observable<any[]> {
		if (term == null) {
			return of([]);
		}
		if (term.length > 6) {
			var temp: Observable<any>;
			temp = new Observable(observer => {
				return this.equifaxService.serachCompanyByName(term)
					.toPromise()
					.then(result => {
						observer.next(result.records);
						this.orgList = result.records;
					})
					.catch(err => {
						observer.next([]);
						this.orgList = [];
					})
			});
			return temp;
		} else {
			this.orgList = [{ description: 'keeptyping',organisationName: 'test' }];
			return of([{ description: 'keeptyping',organisationName: 'test' }]);
		}
	}

	getAggregatorSearch(term: string): Observable<any[]>{
		if (term == null) {
			return of([]);
		}
		if (term.length > 1) {
			var temp: Observable<any>;
			temp = new Observable(observer => {
				return this.equifaxService.getAggregators(term)
					.toPromise()
					.then(result => {
						console.log(result)
						observer.next(result);
						this.aggregatorList = result;
					})
					.catch(err => {
						observer.next([]);
						this.orgList = [];
					})
			});
			return temp;
		} else {
			this.aggregatorList = [{ description: 'keeptyping',organisationName: 'test' }];
			return of([{ description: 'keeptyping',organisationName: 'test' }]);
		}
	}

	/*
	go to given step
	switch "currentStep" 
	*/
	gotoThisStep(stepNo) {
		var validate=this.validateStepForm()
		if(this.currentStep<stepNo){
			if(!validate){
				this.formSubmitted=true
				this.focusInvalidControl()
				this.spinner.hide();
				return;
			}
		
			if(stepNo==2)
			{
				 this.generateApplicantNumber()
			}
		
			// this.formSubmitted=false;
			this.progressbarValue = (100 / this.totalSteps) * stepNo;
			this.currentStep = stepNo;
			this.formSubmitted = false;
			window.scroll(0,0);
		}

	}
	backStep(stepNo){
		this.formSubmitted=false
		this.currentStep=stepNo
	}
	focusInvalidControl(){
		setTimeout(() => {
		  if(this.elementRef.nativeElement.querySelector('.help.text-danger') != null){
			const invalidControl = this.elementRef.nativeElement.querySelector('.help.text-danger').closest('.form-group');
			if (invalidControl != null && invalidControl != undefined) {
			  var parentStep = invalidControl.closest('.form-step');
			  this.gotoThisStep(parseInt(parentStep));
			  invalidControl.scrollIntoView();
			}
		  }else{
	
		  }
		}, 300);
	  }

	openRollDatePicker(eleId, control){
		var rd = new Rolldate({
			el: '#'+eleId+'',
			format: 'DD/MM/YYYY',
			lang: this.rolldtLang,
			confirm: (date) => {
      			control.setValue(date);
    		}
		});
		rd.show();
	}

	//check and return boolean
	isloogedin(){
		if (localStorage.getItem('isLoggedin') == 'true'){
			return true;
		}else{
			return false;
		}
	}

	/* generate applicant unique identifier string 14 length and includes (A-Z, a-z, 0-9) */
  	generateApplicantNumber(){
		  //alert("called")
    	var randomGeneratedNumberBrokerID = (Date.now().toString(36) + Math.random().toString(36).substr(2, 6)).toUpperCase();
    	var customTimestamp = moment().format('YYYYMMDDHHmmssSSS').substr(2);
    	this.applicantNumber = "I"+randomGeneratedNumberBrokerID.substr(2, 6) + '_' + customTimestamp;
  	}

	/* Get details address components of selected address using Geocoder */
	getLocationDetails(address) {
		return new Promise((resolve, reject) => {
			if (!this.geocoder) this.geocoder = new google.maps.Geocoder()
			this.geocoder.geocode({
				'address': address
			}, (results, status) => {
				if(status == google.maps.GeocoderStatus.OK){
					resolve(results[0]);
				}else{
					reject("Sorry, this search produced no results.");
					// alert("Sorry, this search produced no results.");
				}
			})
		});
	}

	/* Trigger on select of address from search result */
	async onSelectPlaceItem(data, control){
		await this.getLocationDetails(data.description)
		.then((addObject: any) => {
			addObject.prefix = data.prefix;
			var addressFieldValues = this.getAddressArrayFromComponent(addObject);
			// control.get('RawAddress').setValue(addObject.RawAddress);
			// control.patchValue(addressFieldValues);
			control.setValue(addressFieldValues.RawAddress);
		})
		.catch(err => {
			console.log(err);
		});
	}

	/* Get address components from responded */
  	getAddressArrayFromComponent(addressComponents){
	    var address: any = {};
	    var custom_formatted_address = '';
	    address['RawAddress'] = addressComponents.formatted_address;
	    if(addressComponents.address_components.length > 0){
	      for(var part of addressComponents.address_components) {
	        if(part['types'].indexOf('subpremise') > -1){
	            address['Subpremise'] = part['long_name'];
	            custom_formatted_address += 'Unit ' + part['long_name'] + ', ';
	        }
	        if(part['types'].indexOf("street_number") > -1){
	            address['StreetNumber'] = part['long_name'];
	            custom_formatted_address += ' ' + part['long_name'];
	        }
	        if(part['types'].indexOf("route") > -1){
	            address['StreetName'] = part['long_name'];
	            var n = part['long_name'].split(" ");
	            address['StreetType'] = n[n.length - 1];
	            custom_formatted_address += ' ' + part['short_name'] + ', ';
	        }
	        if((part['types'].indexOf("locality") > -1) && (part['types'].indexOf("political") > -1)){
	            address['Political'] = part['long_name'];
	        }
	        if(part['types'].indexOf("administrative_area_level_2") > -1){
	            address['SuburbTown'] = part['long_name'];
	        }
	        if(part['types'].indexOf("administrative_area_level_1") > -1){
	            address['Region'] = part['short_name'];
	            custom_formatted_address += ' ' + part['short_name'];
	        }
	        if(part['types'].indexOf("country") > -1){
	            address['Country'] = part['long_name'];
	            custom_formatted_address += ', '+ part['long_name'];
	        }
	        if(part['types'].indexOf("postal_code") > -1){
	            address['PostCode'] = part['long_name'];
	            custom_formatted_address += ' '+ part['short_name'];
	        }
	      }
	    }
	    if(this.autoCompletePrefix != ''){
	      address['RawAddress'] = addressComponents.prefix + " " + addressComponents.formatted_address;
	    }
	    return address;
  	}

  	getplacelist(term: string): Observable<any[]> {
      	if(term == null){
        	return of([]);
      	}
        if(term.length > 6){
          var temp: Observable<any>;
          temp = new Observable(observer => {
            this.getPlacePredictions(term).then(res => {
            	observer.next(res);
            })
            .catch(err => {
            	observer.next([]);
            })
          });
          return temp;
        }else{
            this.addressList = [{description: 'keeptyping'}];
            return of([{description: 'keeptyping'}]);
        }
	  }
	
	getPlacePredictions(term){
		return new Promise(async (resolve, reject) => {
			var cleanedTerm = await this.cleanSerachTerm(term);
            term = cleanedTerm.term;
            var prefix = cleanedTerm.prefix;
			this.autocompleteService.getPlacePredictions(Object.assign({input: term}, 
            {
              	types: ['geocode'],
              	componentRestrictions: {country: 'au'}
            }),(data) => {
              	if(data != null){
	              	var data = data.map(function(el) {
					  var o = Object.assign({}, el);
					  o.prefix = prefix;
					  return o;
					})
            	resolve(data);
              	}else{
                	resolve([]);
              	}
            });
		})
	}


	/* 
	Clean address search term
	By removing unit / apprtment number from input text
	*/
	cleanSerachTerm(term: string): any{
		try{
			var match: any = /\d+[a-zA-Z]*\s\d+/.exec(term);
			var a = term.indexOf(match[0]);
			var b = match[0].indexOf(' ');
			var address_new = term.substring(a+b+1);
			var prefix = term.substring(0, a+b);
			this.autoCompletePrefix = this.titleCase.transform(prefix);
			return {
				'prefix': this.titleCase.transform(prefix),
				'term': address_new
			}
		}catch{
			return {
				'prefix': '',
				'term': term
			}
		}
	}
	validateStepForm(){

		switch (this.currentStep) {
			
			case 1:
			  if(this.accreditationForm.get('companyName').invalid){
				this.accreditationForm.get('companyName').markAsDirty();
				return false;
			  }
			  break;
	  
			case 2:
			  var companyDetails = [
				'natureofBusiness',
				'entityType',
				'abn',
				'entityName',
				'acn',
				'businessAddress',
				'heldAccreditationBefore',
				'growbizAccreditationId',
				'ispartOfgroupOrAggregator',
				'groupOrAggregatorName',
				'officeNumber',
				
			  ];
			  for(var i=0; i<=companyDetails.length-1; i++){
				var fcName = companyDetails[i];
				if(this.accreditationForm.get(fcName) != null){
				  if(this.accreditationForm.get(fcName).invalid){
					this.accreditationForm.get(fcName).markAsDirty();
					return false;
					break;
				  }
				}
			  }
			  break;
			  
			case 3:
				var introducerDetails = [
				  'driverLicence',
				  'title',
				  'givenName',
				  'middlename',
				  'surName',
				  'hasAnotherName',
				  'otherNames',
				  'dob',
				  'mobileNumber',
				  'email',
				  'residentialAddress',
				  'driverLicenceNumber',
				  'driverLicenceIssuingState',
				  'driverLicenceExpiryDate',

				  
				];
				for(var i=0; i<=introducerDetails.length-1; i++){
				  var fcName = introducerDetails[i];
				  if(this.accreditationForm.get(fcName) != null){
					if(this.accreditationForm.get(fcName).invalid){
						console.log(fcName, this.accreditationForm.get(fcName));
					  	this.accreditationForm.get(fcName).markAsDirty();
					  	return false;
					  	break;
					}
				  }
				}
				break;

				
			case 4:
				var creditLicenseDetails = [
				  'hasAustralianCreditLicence',
				  'australianCreditLicenceNumber',
				  'dirORemployeeOfLicenceEntity',
				  'hasACRN'
				  ];
				for(var i=0; i<=creditLicenseDetails.length-1; i++){
				  var fcName = creditLicenseDetails[i];
				  if(this.accreditationForm.get(fcName) != null){
					if(this.accreditationForm.get(fcName).invalid){
					  this.accreditationForm.get(fcName).markAsDirty();
					  return false;
					  break;
					}
				  }
				}
				break;
				case 5:
					var introduceAcknowledgeDetails = [
					  'declaredBankrupt',
					  'refusedAccreditation',
					  'convictedOfFraud',
					  'convictedOfFraudDetails',
					  
	
					  
					];
					for(var i=0; i<=introduceAcknowledgeDetails.length-1; i++){
					  var fcName = introduceAcknowledgeDetails[i];
					  if(this.accreditationForm.get(fcName) != null){
						if(this.accreditationForm.get(fcName).invalid){
						  this.accreditationForm.get(fcName).markAsDirty();
						  return false;
						  break;
						}
					  }
					}
					break;
	

			  default:
				return true;
				break;
	}
	return true;
}

	/* trigger on form submission */
	submitForm(){
		// this.spinner.show();
		// var isValid=this.validateStepForm()
		// if(isValid){
		this.formSubmitted = true;
		console.log("accreditation",moment(this.accreditationForm.value.dob).format('YYYY-MM-DD'))
		if(this.accreditationForm.valid){
		var type= '';
	    if(this.accreditationForm.value.natureofBusiness == 'financebroker'){
			type='broker'
		}else{
			type='vendor'
		}
			let obj = {
				"SalesForceIdExists":this.salesForceIdExists,
				"existingSfId":this.companySfId,
				"ABN":this.accreditationForm.value.abn,
				"ACN":this.accreditationForm.value.acn,
				"Type":type,
				"EntityName":this.accreditationForm.value.entityName,
				"EntityType":this.accreditationForm.value.entityType,
				"Aggregator":this.aggregatorSfId,
				"GivenName": this.accreditationForm.value.givenName,
				"SurName":this.accreditationForm.value.surName,
				"Title":this.accreditationForm.value.title,
				"Mobile":this.accreditationForm.value.mobileNumber,
				"Telephone":this.accreditationForm.value.officeNumber,
				"DoB":moment(this.accreditationForm.value.dob).format('YYYY-MM-DD'),
				"StreetName":this.accreditationForm.value.residentialAddress.StreetName,
				"StreetNumber": this.accreditationForm.value.residentialAddress.StreetNumber,
				"StreetType": this.accreditationForm.value.residentialAddress.StreetType,
				"Suburb": this.accreditationForm.value.residentialAddress.Suburb,
				"State": this.accreditationForm.value.residentialAddress.State,
				"Postcode": this.accreditationForm.value.residentialAddress.Postcode,
				"DriverLicense": this.accreditationForm.value.driverLicenceNumber,
				"AccountID": this.applicantNumber,
				"Email":this.accreditationForm.value.email
			}

			setTimeout(() => {
				var htmlBody = this.generateMailBody(this.accreditationForm.getRawValue());
				this.accreformService.sendAccreditationForm(""+htmlBody+"",obj)
				.toPromise()
				.then(res => {
					this.spinner.hide();
					this.formAlert = [{
						type: "success",
						message: 'Form submitted successfully'
					}];
				})
				.catch(err => {
					this.spinner.hide();
					this.formAlert = [{
						type: "danger",
						message: 'Can not submit form! Please try again later'
					}];
					console.log(err);
				})
			}, 200);
		// }
		// }else{
		// 	Object.keys(this.accreditationForm.controls).forEach(key => {

		// 		const controlErrors: ValidationErrors = this.accreditationForm.get(key).errors;
		// 		if (controlErrors != null) {
		// 			  Object.keys(controlErrors).forEach(keyError => {
		// 				console.log('Key control: ' + key + ', keyError: ' + keyError + ', err value: ', controlErrors[keyError]);
		// 			  });
		// 			}
		// 		  });
		// 	this.spinner.hide();
		// 	this.formAlert = [{
		// 		type: "danger",
		// 		message: 'Form is Invalid'
		// 	}];
		}
		window.scroll(0,0);
	}

	generateMailBody(data){
		var html = `
		<html>
		<head>
			<style type="text/css">
				.table-bordered>tbody>tr>td, .table-bordered>tbody>tr>th, .table-bordered>tfoot>tr>td, .table-bordered>tfoot>tr>th, .table-bordered>thead>tr>td, .table-bordered>thead>tr>th {
					border: 1px solid #ddd;
				}
				.table>tbody>tr>td, .table>tbody>tr>th, .table>tfoot>tr>td, .table>tfoot>tr>th, .table>thead>tr>td, .table>thead>tr>th {
					padding: 8px;
					line-height: 1.42857143;
					vertical-align: top;
					border-top: 1px solid #ddd;
				}
				table {
					border-collapse: collapse;
					border-spacing: 0;
				}
				tbody {
					display: table-row-group;
					vertical-align: middle;
					border-color: inherit;
				}
				.table-bordered {
					border: 1px solid #ddd;
				}
				.table {
					width: 100%;
					max-width: 100%;
					margin-bottom: 20px;
				}
				table {
					background-color: transparent;
				}
			</style>
		</head>
		<body>
		<table class="table table-bordered accreditation-table">
			<tbody>
				<tr><td colspan="2"><h1>Application Reference Number: ${this.applicantNumber}</h1></td></tr>
				<tr><td>Company name</td><td>${data.companyName}</td></tr>
				<tr><td>Nature of business  </td><td> ${data.natureofBusiness}</tr></td>

				<tr><td colspan="2"><h1>Company details and address</h1></td></tr>
				<tr><td>ABN </td><td>${data.abn}</td></tr>`;
				if(data.tradingName != undefined){
					html += `<tr><td>Trading name </td><td>${data.tradingName}</td></tr>`;
				}
				if(data.acn != undefined){
					html+=`<tr><td>ACN </td><td> ${data.acn} </td></tr>`;
				}
				html += `
				<tr><td>Business address </td><td> ${data.businessAddress.RawAddress}</tr></td>
				<tr><td>Have you ever held an accreditation with Grow Finance? </td><td><strong>${(data.heldAccreditationBefore) ? 'Yes':'No'}</strong></td></tr>
				`;
				if(data.growbizAccreditationId != undefined){
					html += `
						<tr><td>Please provide Grow Finance ID below or firm name if unknown. </td><td><strong>${data.growbizAccreditationId}</strong></tr></td>
					`;
				}
				html += `<tr><td>Are you part of a group or aggregator? </td><td><strong>${(data.ispartOfgroupOrAggregator) ? 'Yes' : 'No'}</strong></td></tr>`;
				if(data.groupOrAggregatorName != undefined){
					html += `<tr><td>Group or Aggregator </td><td><strong>${data.groupOrAggregatorName}</strong></td></tr>`;
				}
				html += `
				<tr><td colspan="2"><h1>Contact details</h1></td></tr>
				<tr><td>Office number</td><td> ${data.officeNumber}</td></tr>

				<tr><td colspan="2"><h1>Introducer Details</h1></td></tr>
				<tr><td>Title: </td><td>${data.title}</td></tr>
				<tr><td>Given name: </td><td>${data.givenName}</td></tr>`;
				if(data.middleName != undefined){
					html += `<tr><td>Middle name </td><td> ${data.middleName}</td></tr>`;
				}
				html += `<tr><td>Surname</td><td>${data.surName}</td></tr>`;
				if(data.preferredName != undefined){
					html += `<tr><td>Preferred name</td><td> ${data.preferredName}</td></tr>`;
				}

				html += `
				<tr><td>Have you ever been known by another name/s?</td><td> ${(data.hasAnotherName) ? 'Yes':'No'}</td></tr>`;
				if(data.otherNames != undefined){
					html += `<tr><td>Other name/s </td><td>${data.otherNames}</td></tr>`;
				}
				html += `
				<tr><td>Date of birth </td><td>${data.dob}</td></tr>
				<tr><td>Mobile</td><td> ${data.mobileNumber}</td><tr>
				<tr><td>Email address</td><td> ${data.email}</td></tr>
				<tr><td>Residential address</td><td> ${data.residentialAddress.RawAddress}</td></tr>
				<tr><td>Driver's licence number </td><td> ${data.driverLicenceNumber}</td></tr>
				<tr><td>Issuing state </td><td>${data.driverLicenceIssuingState}</td></tr>
				<tr><td>Expiry date</td><td> ${data.driverLicenceExpiryDate}</td></tr>

				<tr><td colspan="2"><h1>Credit Licence Details</h1></td></tr>
				<tr><td>Do you hold an Australian Credit Licence in your own right? </td><td><strong>${(data.hasAustralianCreditLicence) ? 'Yes': 'No'}</strong></td></tr>`;
				if(data.australianCreditLicenceNumber != undefined){
				html += `
					<tr><td>Please provide your Australian Credit Licence number. </td><td> <strong>${data.australianCreditLicenceNumber}</strong></td></tr>
				`;
				}
				if(data.dirORemployeeOfLicenceEntity != undefined){
					html += `<tr><td>Are you a director/employee of a licensed entity? </td><td> <strong>${(data.dirORemployeeOfLicenceEntity) ? 'Yes': 'No' }</strong></td></tr>`;
				}
				if(data.hasACRN != undefined){
					html += `<tr><td>Do you hold an Australian Credit Representative Number?</td><td> <strong>${(data.hasACRN) ? 'Yes': 'No'}</strong></td></tr>`;
				}
				if(data.ACRN != undefined){
					html+=`<tr><td>Please provide your Australian Credit Representive number. </td><td><strong>${data.ACRN}</strong></td></tr>`;
				}
				if(data.convictedOfFraudDetails != undefined){
					html+=`<tr><td>Where you have answered 'yes' above, please provide further detail</td><td> <strong>${(data.convictedOfFraudDetails) ? 'Yes': 'No'}</strong></td></tr>`;
				}
				html += `
				<tr><td colspan="2"><h1>Introducer Acknowledgements</h1></td></tr>
				<tr><td>Have you ever been declared bankrupt or subject to a Part 9 or 10 debt arrangement? </td><td> <strong>${(data.declaredBankrupt) ? 'Yes': 'No'}</strong></td></tr>
				<tr><td>Have you ever been refused accreditation with any other lender? </td><td><strong>${(data.refusedAccreditation)? 'Yes': 'No'}</strong></td></tr>
				<tr><td>Have you ever been convicted of fraud or has any financial institution cancelled your accreditation? </td><td><strong>${(data.convictedOfFraud) ? 'Yes':'No'}</strong></td></tr>
				`;
				if(data.convictedOfFraudDetails != undefined){
				html += `
					<tr><td>Convicted of fraud further detail</td><td>${data.convictedOfFraudDetails}</td></tr>
				`;
				}
				html +=`
					</tbody>
				</table>
			</body>
		</html>
		`;
		return html;
	}

}
