import React, {Component} from 'react';
import { Header, Step } from 'semantic-ui-react';

class Top extends Component {
  constructor(props) {
    super(props);
    const steps = [
      {
        icon: 'openid',
        title: 'OAuth',
        description: 'Make an OAuth 2 request',
        href: '/'
      },
      {
        icon: 'sign in',
        title: 'Log in',
        description: 'Authenticate a user'
      },
      {
        icon: 'thumbs outline up',
        title: 'Consent',
        description: 'Authorize an access request'
      }
    ];
    this.state = { steps: steps };
    this.setActive = this.setActive.bind(this);
    this.setActive(this.props.step);
  }

  setActive(activeStep) {
    const steps = this.state.steps.map(step => {
      step.active = step.title === activeStep;
      return step;
    });
    this.setState({ steps: steps });
  }

  render() {
    const { Group } = Step;
    return (
      <div className="ui">
        <Header as='h1'>Broker Auth Explorer</Header>
        <Group items={this.state.steps} size="large"/>
      </div>
    );
  }
}

export default Top;
