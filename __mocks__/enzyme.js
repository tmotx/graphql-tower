import { configure, ShallowWrapper } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

// https://github.com/airbnb/enzyme/issues/1295
ShallowWrapper.prototype.diveTo = function diveTo(name, options) {
  let component = this;

  while (component.name() !== name) {
    component = component.dive(options);
  }
  component = component.dive();

  return component;
};

export * from 'enzyme';
