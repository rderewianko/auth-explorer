import React, {Component} from 'react';
import 'whatwg-fetch';
import AceEditor from 'react-ace';
import { Dimmer, Loader, Button, Input, Form } from 'semantic-ui-react';
import IdentityAuthenticatorList from './IdentityAuthenticatorList';
import './AuthRequest.css';

import 'brace/mode/json';
import 'brace/theme/github';

class AuthRequester extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: this.props.url,
      body: '',
      headers: [],
      loading: false,
      authenticators: []
    };
    this.doGet = this.doGet.bind(this);
    this.doPut = this.doPut.bind(this);
    this.setBodyFromObject = this.setBodyFromObject.bind(this);
    this.updateUrl = this.updateUrl.bind(this);
    this.updateBody = this.updateBody.bind(this);
    this.parseBody = this.parseBody.bind(this);
    this.removeIdentityAuthenticator = this.removeIdentityAuthenticator.bind(this);
  }

  updateUrl(event) {
    this.setState({ url: event.target.value });
  }

  setBodyFromObject(body) {
    const json = JSON.stringify(body, null, 2);
    this.setState({ body: json });
    this.parseBody(json);
  }

  updateBody(body) {
    this.setState({ body: body });
    try {
      this.parseBody(body);
    } catch (e) {
      // Do nothing, because the body might fail to parse while the
      // user is making edits.
    }
  }

  parseBody(json) {
    if (json) {
      let body = JSON.parse(json);
      const meta = body.meta;
      const followUp = body.followUp;
      const authenticators = Object.keys(body).filter(key => {
        return key.startsWith('urn');
      });
      const client = body.client;
      let username = '';
      let formattedName = '';
      if (body.sessionIdentityResource) {
        username = body.sessionIdentityResource.userName;
        formattedName = body.sessionIdentityResource['name.formatted'];
      }
      this.setState({
        meta: meta,
        followUp: followUp,
        authenticators: authenticators,
        username: username,
        formattedName: formattedName,
        client: client
      });
    }
  }

  removeIdentityAuthenticator(urn) {
    console.log("requested remove of " + urn);
    let body = JSON.parse(this.state.body);
    delete body[urn];
    console.log(body);
    this.setBodyFromObject(body);
  }

  static doSubmit(event) {
    event.preventDefault();
  }

  doGet() {
    console.log("GET");
    this.setState({ loading: true });
    fetch(this.state.url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      }).then(response => {
        this.setState({ loading: false });
        return response.json();
      }).then(json => {
        this.setBodyFromObject(json);
      }).catch(ex => {
        this.setState({ loading: false });
        console.warn('parsing failed', ex)
      });
  }

  doPut() {
    console.log("PUT");
    this.setState({ loading: true });
    fetch(this.state.url, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: this.state.body
      }).then(response => {
        this.setState({ loading: false });
        return response.json();
      }).then(json => {
        this.setBodyFromObject(json);
      }).catch(ex => {
        this.setState({ loading: false });
        console.warn('parsing failed', ex)
      });
  }

  render() {
    const { active } = this.state.loading;
    return (
        <div>
          <div className="AuthRequest">
            <Dimmer.Dimmable dimmed={active}>
              <Dimmer active={active}/>
              <Loader active={active}/>
              <Form onSubmit={AuthRequester.doSubmit}>
                <Form.Group inline>
                  <Form.Field width="sixteen">
                    <label>URL</label>
                    <Input
                        type="text"
                        name="url"
                        className="Url"
                        onChange={this.updateUrl}
                        value={this.state.url}
                    />
                  </Form.Field>
                </Form.Group>
                <Form.Group inline>
                  <Form.Field width="sixteen">
                    <AceEditor
                        mode="json"
                        theme="github"
                        showPrintMargin={false}
                        onChange={this.updateBody}
                        value={this.state.body}
                        name="AuthExplorerEditor"
                        width="100%"
                    />
                  </Form.Field>
                </Form.Group>
                <Form.Group inline>
                  <Form.Field>
                    <Button primary onClick={this.doGet}>GET</Button>
                  </Form.Field>
                  <Form.Field>
                    <Button secondary onClick={this.doPut}>PUT</Button>
                  </Form.Field>
                </Form.Group>
              </Form>
            </Dimmer.Dimmable>
          </div>
          <div className="AuthInfo">
            <IdentityAuthenticatorList
                authenticators={this.state.authenticators}
                removeAuthenticator={this.removeIdentityAuthenticator}
            />
          </div>
        </div>
    );
  }
}

export default AuthRequester;
