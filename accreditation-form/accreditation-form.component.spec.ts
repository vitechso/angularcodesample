import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AccreditationFormComponent } from './accreditation-form.component';

describe('AccreditationFormComponent', () => {
  let component: AccreditationFormComponent;
  let fixture: ComponentFixture<AccreditationFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AccreditationFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccreditationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
