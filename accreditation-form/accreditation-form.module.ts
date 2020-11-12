import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared.module';
import { NgbDropdownModule,NgbModule, NgbActiveModal, NgbDateParserFormatter, NgbDropdown } from '@ng-bootstrap/ng-bootstrap';

import { NgbDateStringParserFormatterAccreditation } from './ngb-date-string-parser-formatter-accreditation';

import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskModule, MaskService } from 'ngx-mask';
import { TextMaskModule } from 'angular2-text-mask';

import { HeaderComponent } from '../layout/components/header/header.component';
import { SidebarComponent } from '../layout/components/sidebar/sidebar.component';

import { AccreditationFormRoutingModule } from './accreditation-form-routing.module';
import { AccreditationFormComponent } from './accreditation-form.component';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { DeviceDetectorModule } from 'ngx-device-detector'; // to detect device
import { AgmCoreModule, GoogleMapsAPIWrapper, MapsAPILoader, NoOpMapsAPILoader } from '@agm/core';
import { NgxImageCompressService } from 'ngx-image-compress';
import { CollapseModule } from 'ngx-bootstrap/collapse';

@NgModule({
	declarations: [
		AccreditationFormComponent
	],
	schemas: [
		CUSTOM_ELEMENTS_SCHEMA
	],
	imports: [
		CommonModule,
		TranslateModule,
		FormsModule,
		NgbModule.forRoot(),
		ReactiveFormsModule,
		SharedModule,
		NgbDropdownModule,
		NgSelectModule,
		NgxMaskModule.forRoot(),
		TextMaskModule,
		AccreditationFormRoutingModule,
		BsDatepickerModule.forRoot(),
		DeviceDetectorModule.forRoot(),
    	AgmCoreModule.forRoot({apiKey: 'AIzaSyAGN-Wr7Kf6PU5vkcYbta9gvGg_sRfaoY0'})

	],
	providers: [
		TitleCasePipe,
    	GoogleMapsAPIWrapper,
		{
			provide: NgbDateParserFormatter,
			useFactory: () => { return new NgbDateStringParserFormatterAccreditation() }
		},
		NgxImageCompressService
	],
})
export class AccreditationFormModule { }
